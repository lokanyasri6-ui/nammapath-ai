/**
 * Profile-aware pedestrian routing (A* over an explicit footpath graph).
 *
 * Cost of a segment = length × attribute factors + barrier penalties.
 * All factors are ≥ 1 and penalties ≥ 0, so straight-line distance is an
 * admissible A* heuristic and the result is the true minimum-cost path.
 *
 * Hard constraints ("blocks") remove a segment entirely for a profile.
 * Unknown data never makes a route "accessible" — it is penalised and
 * reported back as uncertainty.
 */
import { CATEGORIES, SEVERITY_LABELS } from "./categories";
import { haversineM, pointToSegmentM as pointToSegment, polylineLengthM } from "./geo";
import { PROFILES } from "./profiles";
import { freshness, routingEffect } from "./reports";
import type { BarrierReport, Graph, GraphNode, ProfileId, Segment, Severity } from "./types";

/* ------------------------------------------------------------------ */
/* Segment evaluation                                                  */
/* ------------------------------------------------------------------ */

export interface BarrierOnRoute {
  reportId: string;
  category: BarrierReport["category"];
  severity: Severity;
  status: BarrierReport["status"];
  effect: "certain" | "uncertain";
  stale: boolean;
  segmentName: string;
}

export interface SegmentEval {
  blocked: string | null;
  factor: number;
  penaltyM: number;
  /** Missing data that matters for this profile */
  unknowns: string[];
  barriers: BarrierOnRoute[];
  notes: string[];
}

const SEV_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, impassable: 3 };

/** Penalty in metres for a barrier of a given severity, per profile. */
const BARRIER_PENALTY: Record<ProfileId, Record<Severity, number>> = {
  wheelchair: { low: 40, medium: 250, high: 600, impassable: 5000 },
  walking_aid: { low: 60, medium: 300, high: 700, impassable: 5000 },
  general: { low: 20, medium: 60, high: 180, impassable: 5000 },
  low_vision: { low: 80, medium: 400, high: 800, impassable: 5000 },
};

const STAIRS_REPORT_PENALTY: Record<ProfileId, number> = { wheelchair: 5000, walking_aid: 250, general: 0, low_vision: 80 };

/** Trip-hazard categories weigh more for low-vision and walking-aid users. */
const HAZARD_CATEGORIES = new Set(["construction_debris", "broken_footpath", "waterlogging"]);

export function evaluateSegment(
  seg: Segment,
  reports: BarrierReport[],
  profile: ProfileId,
  now: Date = new Date(),
): SegmentEval {
  const unknowns: string[] = [];
  const notes: string[] = [];
  let factor = 1;
  let penaltyM = 0;
  let blocked: string | null = null;
  const barriers: BarrierOnRoute[] = [];

  /* --- barrier reports on this segment --- */
  for (const r of reports) {
    const effect = routingEffect(r, now);
    if (effect === "ignore") continue;
    const f = freshness(r, now);
    barriers.push({
      reportId: r.id,
      category: r.category,
      severity: r.severity,
      status: r.status,
      effect,
      stale: f.stale,
      segmentName: seg.name,
    });
    let base = BARRIER_PENALTY[profile][r.severity] * (HAZARD_CATEGORIES.has(r.category) && (profile === "low_vision" || profile === "walking_aid") ? 1.2 : 1);
    // Stairs are only "impassable" for step-free travel; other profiles get a fixed, smaller penalty
    // (the segment's own step attributes already shape their cost).
    if (r.category === "stairs" && profile !== "wheelchair") base = STAIRS_REPORT_PENALTY[profile];

    if (effect === "certain") {
      // Hard blocks from confirmed, fresh reports
      if (r.severity === "impassable" && r.category !== "stairs") blocked ??= `Confirmed impassable: ${CATEGORIES[r.category].en}`;
      if (profile === "wheelchair") {
        if (r.category === "stairs") blocked ??= "Confirmed stairs (not step-free)";
        if (r.category === "blocked_ramp" && SEV_RANK[r.severity] >= SEV_RANK.high) blocked ??= "Confirmed blocked ramp";
      }
      penaltyM += base;
    } else {
      // Pending / disputed / stale → partial, freshness-weighted penalty
      const weight = r.status === "disputed" ? 0.25 : 0.5;
      penaltyM += base * weight * Math.max(f.weight, 0.25);
    }
  }

  /* --- segment attributes --- */
  const verifFactor = seg.verification === "verified" ? 1 : seg.verification === "community" ? 1.05 : 1.25;
  if (seg.verification === "unverified") unknowns.push(`${seg.name}: attributes not verified`);

  switch (profile) {
    case "wheelchair": {
      if (seg.steps === "stairs_only" || seg.steps === "some") blocked ??= seg.steps === "stairs_only" ? "Stairs only" : "Has steps";
      if (seg.ramp === "absent") blocked ??= "Ramp missing";
      if (seg.slopePct !== null && seg.slopePct > 8) blocked ??= `Slope ${seg.slopePct}% exceeds 8%`;
      if (seg.widthM !== null && seg.widthM < 0.9) blocked ??= `Width ${seg.widthM} m under 0.9 m`;
      if (seg.steps === "unknown") { factor *= 3; unknowns.push(`${seg.name}: steps unknown`); }
      if (seg.ramp === "unknown") { factor *= 1.5; unknowns.push(`${seg.name}: ramp availability unknown`); }
      if (seg.surface === "unknown") { factor *= 2; unknowns.push(`${seg.name}: surface unknown`); }
      if (seg.surface === "poor") factor *= 2.5;
      if (seg.surface === "fair") factor *= 1.15;
      if (seg.widthM === null) { factor *= 1.2; unknowns.push(`${seg.name}: width unknown`); }
      if (seg.slopePct !== null && seg.slopePct > 5) { factor *= 1.2; notes.push(`Moderate slope (${seg.slopePct}%)`); }
      if (seg.ramp === "present") notes.push("Kerb ramp present");
      break;
    }
    case "walking_aid": {
      if (seg.steps === "stairs_only") {
        factor *= seg.handrail === "yes" ? 2.2 : seg.handrail === "no" ? 4 : 3;
        notes.push(seg.handrail === "yes" ? "Stairs with handrail" : "Stairs — handrail not confirmed");
        if (seg.handrail === "unknown") unknowns.push(`${seg.name}: handrail unknown`);
      } else if (seg.steps === "some") {
        factor *= seg.handrail === "yes" ? 1.5 : 2.5;
        notes.push("A few steps");
      } else if (seg.steps === "unknown") {
        factor *= 1.8;
        unknowns.push(`${seg.name}: steps unknown`);
      }
      if (seg.surface === "poor") factor *= 3;
      if (seg.surface === "unknown") { factor *= 1.8; unknowns.push(`${seg.name}: surface unknown`); }
      if (seg.surface === "fair") factor *= 1.2;
      break;
    }
    case "general": {
      if (seg.steps === "stairs_only") notes.push("Stairs");
      break;
    }
    case "low_vision": {
      if (seg.safeCrossing === "no") { factor *= 5; notes.push("Road crossing without a signal"); }
      if (seg.safeCrossing === "unknown") { factor *= 2.5; unknowns.push(`${seg.name}: crossing safety unknown`); }
      if (seg.safeCrossing === "yes") notes.push(seg.steps === "stairs_only" ? "Grade-separated crossing (footbridge)" : "Signalised crossing");
      if (seg.tactilePaving === "no") factor *= 1.3;
      if (seg.tactilePaving === "unknown") { factor *= 1.15; unknowns.push(`${seg.name}: tactile paving unknown`); }
      if (seg.tactilePaving === "yes") notes.push("Tactile paving");
      if (seg.steps === "stairs_only") factor *= seg.handrail === "yes" ? 1.3 : 2;
      if (seg.surface === "poor") factor *= 2;
      if (seg.surface === "unknown") { factor *= 1.4; unknowns.push(`${seg.name}: surface unknown`); }
      break;
    }
  }

  return { blocked, factor: factor * verifFactor, penaltyM, unknowns, barriers, notes };
}

/* ------------------------------------------------------------------ */
/* A*                                                                  */
/* ------------------------------------------------------------------ */

export function segmentPoints(seg: Segment, nodeById: Map<string, GraphNode>, reverse = false): [number, number][] {
  const a = nodeById.get(seg.from)!;
  const b = nodeById.get(seg.to)!;
  const pts: [number, number][] = [[a.lat, a.lng], ...(seg.via ?? []), [b.lat, b.lng]];
  return reverse ? pts.reverse() : pts;
}

export function segmentLengthM(seg: Segment, nodeById: Map<string, GraphNode>) {
  return polylineLengthM(segmentPoints(seg, nodeById));
}

interface Step {
  segment: Segment;
  reverse: boolean;
}

function astar(
  graph: Graph,
  from: string,
  to: string,
  edgeCost: (seg: Segment, lengthM: number) => number | null,
): { steps: Step[]; cost: number } | null {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const goal = nodeById.get(to);
  if (!goal || !nodeById.has(from)) return null;

  const adj = new Map<string, { seg: Segment; other: string; reverse: boolean }[]>();
  for (const s of graph.segments) {
    if (!nodeById.has(s.from) || !nodeById.has(s.to)) continue;
    (adj.get(s.from) ?? adj.set(s.from, []).get(s.from)!).push({ seg: s, other: s.to, reverse: false });
    (adj.get(s.to) ?? adj.set(s.to, []).get(s.to)!).push({ seg: s, other: s.from, reverse: true });
  }

  const h = (id: string) => {
    const n = nodeById.get(id)!;
    return haversineM([n.lat, n.lng], [goal.lat, goal.lng]);
  };

  const g = new Map<string, number>([[from, 0]]);
  const came = new Map<string, { prev: string; step: Step }>();
  const open = new Set<string>([from]);
  const closed = new Set<string>();

  while (open.size) {
    let current = "";
    let best = Infinity;
    for (const id of open) {
      const f = (g.get(id) ?? Infinity) + h(id);
      // deterministic tie-break on id
      if (f < best - 1e-9 || (Math.abs(f - best) < 1e-9 && id < current)) {
        best = f;
        current = id;
      }
    }
    if (current === to) {
      const steps: Step[] = [];
      let c = to;
      while (c !== from) {
        const e = came.get(c)!;
        steps.unshift(e.step);
        c = e.prev;
      }
      return { steps, cost: g.get(to)! };
    }
    open.delete(current);
    closed.add(current);
    for (const { seg, other, reverse } of adj.get(current) ?? []) {
      if (closed.has(other)) continue;
      const cost = edgeCost(seg, segmentLengthM(seg, nodeById));
      if (cost === null) continue;
      const tentative = g.get(current)! + cost;
      if (tentative < (g.get(other) ?? Infinity) - 1e-9) {
        g.set(other, tentative);
        came.set(other, { prev: current, step: { segment: seg, reverse } });
        open.add(other);
      }
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type AccessClaim = "supported" | "uncertain" | "not_applicable";

export interface RouteInstruction {
  text: string;
  textTa: string;
  distanceM: number;
  warnings: string[];
}

export interface VerificationMission {
  segmentId: string;
  segmentName: string;
  question: string;
  questionTa: string;
  lat: number;
  lng: number;
}

export interface RouteOption {
  kind: "shortest" | "best_match";
  label: string;
  labelTa: string;
  distanceM: number;
  cost: number;
  path: [number, number][];
  segmentIds: string[];
  barriers: BarrierOnRoute[];
  reasons: string[];
  uncertainties: string[];
  /** Does the data support calling this route suitable for the chosen profile? */
  claim: AccessClaim;
  claimText: string;
  /** Share of route length (0–1) backed by verified or recent community data with no open uncertain reports. */
  dataConfidence: number;
  /** Profile hard constraints violated by this route (only possible for the "shortest" option). */
  violations: string[];
  instructions: RouteInstruction[];
  missions: VerificationMission[];
}

export interface RouteResult {
  profile: ProfileId;
  from: GraphNode;
  to: GraphNode;
  options: RouteOption[];
  /** Set when no route satisfies the profile's hard constraints. */
  noRoute: { message: string; blockers: string[] } | null;
  limitations: string;
  computedAt: string;
}

const STALE_SEGMENT_DAYS = 180;

function bearingLabel(a: [number, number], b: [number, number]) {
  const y = Math.sin(((b[1] - a[1]) * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180);
  const x =
    Math.cos((a[0] * Math.PI) / 180) * Math.sin((b[0] * Math.PI) / 180) -
    Math.sin((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.cos(((b[1] - a[1]) * Math.PI) / 180);
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  const en = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];
  const ta = ["வடக்கு", "வடகிழக்கு", "கிழக்கு", "தென்கிழக்கு", "தெற்கு", "தென்மேற்கு", "மேற்கு", "வடமேற்கு"];
  const i = Math.round(deg / 45) % 8;
  return { en: en[i], ta: ta[i] };
}

function buildOption(
  kind: RouteOption["kind"],
  steps: Step[],
  cost: number,
  graph: Graph,
  reportsBySeg: Map<string, BarrierReport[]>,
  profile: ProfileId,
  now: Date,
): RouteOption {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const path: [number, number][] = [];
  const barriers: BarrierOnRoute[] = [];
  const uncertainties = new Set<string>();
  const violations: string[] = [];
  const instructions: RouteInstruction[] = [];
  const missions: VerificationMission[] = [];
  let distanceM = 0;
  let confidentM = 0;
  let criticalUnknown = false;

  for (const { segment: seg, reverse } of steps) {
    const pts = segmentPoints(seg, nodeById, reverse);
    if (path.length) pts.shift();
    path.push(...pts);
    const len = segmentLengthM(seg, nodeById);
    distanceM += len;

    const ev = evaluateSegment(seg, reportsBySeg.get(seg.id) ?? [], profile, now);
    if (ev.blocked) violations.push(`${seg.name}: ${ev.blocked}`);
    ev.unknowns.forEach((u) => uncertainties.add(u));
    barriers.push(...ev.barriers);

    if (profile === "wheelchair" && (seg.steps === "unknown" || seg.ramp === "unknown")) criticalUnknown = true;
    if (profile === "low_vision" && seg.safeCrossing === "unknown") criticalUnknown = true;

    const segAgeDays = (now.getTime() - new Date(seg.updatedAt).getTime()) / 86_400_000;
    const segStale = segAgeDays > STALE_SEGMENT_DAYS;
    if (segStale) uncertainties.add(`${seg.name}: data last updated ${Math.round(segAgeDays)} days ago`);
    const openUncertain = ev.barriers.some((b) => b.effect === "uncertain");
    if (seg.verification !== "unverified" && !segStale && !openUncertain) confidentM += len;

    for (const b of ev.barriers) {
      if (b.effect === "uncertain") {
        uncertainties.add(
          `${seg.name}: ${CATEGORIES[b.category].en} report is ${b.stale ? "stale (may be outdated)" : b.status}`,
        );
      }
    }

    // Verification missions: the data gaps that most limit confidence on this route.
    const needsCheck =
      seg.verification === "unverified" ||
      segStale ||
      ev.barriers.some((b) => b.stale || b.status === "pending" || b.status === "disputed");
    if (needsCheck) {
      const mid = pts[Math.floor(pts.length / 2)] ?? pts[0];
      const q = ev.barriers.find((b) => b.stale || b.status !== "confirmed");
      missions.push({
        segmentId: seg.id,
        segmentName: seg.name,
        question: q
          ? `Is the ${CATEGORIES[q.category].en.toLowerCase()} on ${seg.name} still there?`
          : `What is the footpath on ${seg.name} like? (steps, ramp, surface)`,
        questionTa: q
          ? `${seg.name} இல் "${CATEGORIES[q.category].ta}" இன்னும் உள்ளதா?`
          : `${seg.name} நடைபாதை எப்படி உள்ளது? (படிகள், சாய்வுதளம், மேற்பரப்பு)`,
        lat: mid[0],
        lng: mid[1],
      });
    }

    const dir = bearingLabel(pts[0], pts[pts.length - 1]);
    const warnings = [
      ...ev.barriers.map(
        (b) =>
          `${CATEGORIES[b.category].en} (${SEVERITY_LABELS[b.severity].en.toLowerCase()}, ${b.stale ? "stale" : b.status})`,
      ),
      ...ev.notes.filter((n) => /stairs|steps|without|slope/i.test(n)),
    ];
    const m = Math.round(len / 5) * 5;
    instructions.push({
      text: `Head ${dir.en} along ${seg.name} for about ${m} m.${ev.notes.length ? " " + ev.notes.join(". ") + "." : ""}`,
      textTa: `${seg.name} வழியாக ${dir.ta} நோக்கி சுமார் ${m} மீ செல்லவும்.`,
      distanceM: len,
      warnings,
    });
  }

  const p = PROFILES[profile];
  let claim: AccessClaim = "not_applicable";
  let claimText = "";
  if (profile === "general") {
    claimText = "Distance-based route. Reported barriers are listed below.";
  } else if (violations.length) {
    claim = "not_applicable";
    claimText = `Does NOT meet ${p.en.toLowerCase()} constraints — shown for comparison only.`;
  } else if (barriers.some((b) => b.effect === "certain" && SEV_RANK[b.severity] >= SEV_RANK.medium)) {
    const n = barriers.filter((b) => b.effect === "certain" && SEV_RANK[b.severity] >= SEV_RANK.medium).length;
    claim = "uncertain";
    claimText = `Meets your hard constraints, but passes ${n} confirmed barrier${n > 1 ? "s" : ""} — check them below before you go.`;
  } else if (criticalUnknown || barriers.some((b) => b.effect === "uncertain")) {
    claim = "uncertain";
    claimText =
      profile === "wheelchair"
        ? "Best available match, but step-free access is NOT confirmed for every segment. Check the uncertainties."
        : `Best available match for ${p.en.toLowerCase()}, with some unconfirmed data.`;
  } else {
    claim = "supported";
    claimText =
      profile === "wheelchair"
        ? "Step-free according to the available data. Conditions can change — this is not a guarantee."
        : `Matches ${p.en.toLowerCase()} preferences according to the available data. Not a safety guarantee.`;
  }

  return {
    kind,
    label: kind === "shortest" ? "Shortest route" : "Best match for your profile",
    labelTa: kind === "shortest" ? "குறுகிய வழி" : "உங்கள் தேவைக்கு ஏற்ற வழி",
    distanceM: Math.round(distanceM),
    cost: Math.round(cost),
    path,
    segmentIds: steps.map((s) => s.segment.id),
    barriers,
    reasons: [],
    uncertainties: [...uncertainties],
    claim,
    claimText,
    dataConfidence: distanceM ? Math.round((confidentM / distanceM) * 100) / 100 : 0,
    violations,
    instructions,
    missions,
  };
}

export function findRoutes(
  graph: Graph,
  reports: BarrierReport[],
  fromId: string,
  toId: string,
  profile: ProfileId,
  now: Date = new Date(),
): RouteResult {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const from = nodeById.get(fromId);
  const to = nodeById.get(toId);
  if (!from || !to) throw new RangeError("Unknown start or destination.");

  const reportsBySeg = new Map<string, BarrierReport[]>();
  for (const r of reports) {
    if (!r.segmentId) continue;
    (reportsBySeg.get(r.segmentId) ?? reportsBySeg.set(r.segmentId, []).get(r.segmentId)!).push(r);
  }
  const result: RouteResult = {
    profile,
    from,
    to,
    options: [],
    noRoute: null,
    limitations: PROFILES[profile].limitations,
    computedAt: now.toISOString(),
  };
  if (fromId === toId) {
    result.noRoute = { message: "Start and destination are the same place.", blockers: [] };
    return result;
  }

  // 1) Shortest: pure distance, only avoiding confirmed-impassable segments (general pedestrian rules).
  const shortest = astar(graph, fromId, toId, (seg, len) => {
    const ev = evaluateSegment(seg, reportsBySeg.get(seg.id) ?? [], "general", now);
    return ev.blocked ? null : len;
  });

  // 2) Best match: profile cost with hard constraints.
  const best = astar(graph, fromId, toId, (seg, len) => {
    const ev = evaluateSegment(seg, reportsBySeg.get(seg.id) ?? [], profile, now);
    return ev.blocked ? null : len * ev.factor + ev.penaltyM;
  });

  const shortOpt = shortest ? buildOption("shortest", shortest.steps, shortest.cost, graph, reportsBySeg, profile, now) : null;
  const bestOpt = best ? buildOption("best_match", best.steps, best.cost, graph, reportsBySeg, profile, now) : null;

  if (!bestOpt) {
    // Explain which constraints block every path, using the unconstrained shortest path as evidence.
    const blockers = new Set<string>();
    if (shortOpt) shortOpt.violations.forEach((v) => blockers.add(v));
    for (const s of graph.segments) {
      if (s.from === toId || s.to === toId || s.from === fromId || s.to === fromId) {
        const ev = evaluateSegment(s, reportsBySeg.get(s.id) ?? [], profile, now);
        if (ev.blocked) blockers.add(`${s.name}: ${ev.blocked}`);
      }
    }
    result.noRoute = {
      message: `No route meeting the "${PROFILES[profile].en}" constraints was found in the current data. We will not suggest a route we cannot support.`,
      blockers: [...blockers],
    };
    if (shortOpt) {
      shortOpt.reasons.push("Shown for information only: it does not meet your profile's constraints.");
      result.options.push(shortOpt);
    }
    return result;
  }

  const same = shortOpt && shortOpt.segmentIds.join() === bestOpt.segmentIds.join();
  if (same) {
    bestOpt.label = "Shortest route — also the best match";
    bestOpt.labelTa = "குறுகிய வழி — உங்கள் தேவைக்கும் ஏற்றது";
    bestOpt.reasons.push("The shortest route already satisfies your profile with the lowest penalty.");
    result.options.push(bestOpt);
  } else {
    if (shortOpt) {
      const extra = bestOpt.distanceM - shortOpt.distanceM;
      bestOpt.reasons.push(
        extra > 0
          ? `About ${extra} m (${Math.round((extra / shortOpt.distanceM) * 100)}%) longer than the shortest route.`
          : "Same or shorter distance with fewer barriers.",
      );
      const avoided = shortOpt.segmentIds.filter((id) => !bestOpt.segmentIds.includes(id));
      for (const id of avoided) {
        const seg = graph.segments.find((s) => s.id === id)!;
        const ev = evaluateSegment(seg, reportsBySeg.get(id) ?? [], profile, now);
        if (ev.blocked) bestOpt.reasons.push(`Avoids ${seg.name} (${ev.blocked.toLowerCase()}).`);
        else if (ev.barriers.length)
          bestOpt.reasons.push(
            `Avoids ${seg.name} (${ev.barriers.map((b) => CATEGORIES[b.category].en.toLowerCase()).join(", ")}).`,
          );
        else if (ev.factor > 1.2) bestOpt.reasons.push(`Avoids ${seg.name} (${ev.notes.join(", ").toLowerCase() || "poorer or unknown conditions"}).`);
      }
      if (shortOpt.violations.length) shortOpt.reasons.push("Does not meet your profile's constraints.");
      else shortOpt.reasons.push("Shortest distance, but scores worse for your profile.");
    }
    result.options.push(bestOpt);
    if (shortOpt) result.options.push(shortOpt);
  }
  return result;
}

/** Snap a point to the nearest segment (used when attaching a new report to the graph). */
export function nearestSegment(graph: Graph, lat: number, lng: number, maxM = 60): { segmentId: string; distanceM: number } | null {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  let best: { segmentId: string; distanceM: number } | null = null;
  for (const s of graph.segments) {
    const pts = segmentPoints(s, nodeById);
    for (let i = 1; i < pts.length; i++) {
      const d = pointToSegment([lat, lng], pts[i - 1], pts[i]);
      if (!best || d < best.distanceM) best = { segmentId: s.id, distanceM: d };
    }
  }
  return best && best.distanceM <= maxM ? best : null;
}

