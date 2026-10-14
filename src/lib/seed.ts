/**
 * SYNTHETIC DEMONSTRATION DATA
 * ---------------------------------------------------------------
 * Everything in this file is invented for the hackathon demo. The
 * coordinates sit in a small block of Mylapore, Chennai so the map
 * looks familiar, but the nodes, footpath attributes and barriers
 * do NOT describe real conditions on the ground and are labelled
 * `origin: "synthetic_demo"` everywhere they appear in the UI.
 *
 * The graph is designed to demonstrate:
 *  1. Bus Stop → Health Centre: the shortest path uses a stairs-only
 *     footbridge; a wheelchair profile must take a LONGER east route
 *     with a verified signalised crossing and kerb ramps.
 *  2. The west alternative has a pending (unconfirmed) debris report
 *     and an unknown-surface segment → shown as uncertain, not blocked.
 *  3. Park Entrance: reachable only through a segment whose steps are
 *     unknown → route is returned but NOT claimed step-free.
 *  4. Market Upper Level: reachable only by stairs → no step-free
 *     route; the app explains the limitation instead of inventing one.
 */
import type { BarrierReport, Graph, GraphNode, Segment } from "./types";

const R0 = 13.0368;
const R1 = 13.0352;
const R3 = 13.0318;
const R4 = 13.0302;
const C0 = 80.2652;
const C1 = 80.2676;
const C2 = 80.2694;
const C3 = 80.2731;
const C4 = 80.2752;

const nodes: GraphNode[] = [
  { id: "bus_north", name: "Bus Stop (North)", nameTa: "பேருந்து நிறுத்தம் (வடக்கு)", lat: R0, lng: C2, kind: "transit", selectable: true },
  { id: "pharmacy", name: "Pharmacy", nameTa: "மருந்தகம்", lat: R0, lng: C3, kind: "entrance", selectable: true },
  { id: "library", name: "Public Library", nameTa: "பொது நூலகம்", lat: R1, lng: C0, kind: "landmark", selectable: true },
  { id: "j_r1c1", name: "West corner (north side)", nameTa: "மேற்கு மூலை (வடக்கு)", lat: R1, lng: C1, kind: "junction", selectable: false },
  { id: "j_r1c2", name: "Footbridge north landing", nameTa: "நடைமேம்பாலம் வடக்கு", lat: R1, lng: C2, kind: "junction", selectable: false },
  { id: "j_r1c3", name: "East signal (north side)", nameTa: "கிழக்கு சிக்னல் (வடக்கு)", lat: R1, lng: C3, kind: "junction", selectable: false },
  { id: "temple_tank", name: "Temple Tank (East)", nameTa: "கோயில் குளம் (கிழக்கு)", lat: R1, lng: C4, kind: "landmark", selectable: true },
  { id: "park", name: "Park Entrance", nameTa: "பூங்கா நுழைவு", lat: R3, lng: C0, kind: "entrance", selectable: true },
  { id: "j_r3c1", name: "West corner (south side)", nameTa: "மேற்கு மூலை (தெற்கு)", lat: R3, lng: C1, kind: "junction", selectable: false },
  { id: "j_r3c2", name: "Footbridge south landing", nameTa: "நடைமேம்பாலம் தெற்கு", lat: R3, lng: C2, kind: "junction", selectable: false },
  { id: "j_r3c3", name: "East signal (south side)", nameTa: "கிழக்கு சிக்னல் (தெற்கு)", lat: R3, lng: C3, kind: "junction", selectable: false },
  { id: "school", name: "School Gate", nameTa: "பள்ளி வாயில்", lat: R4, lng: C1, kind: "entrance", selectable: true },
  { id: "health_centre", name: "Community Health Centre", nameTa: "சமுதாய சுகாதார நிலையம்", lat: R4, lng: C2, kind: "entrance", selectable: true },
  { id: "market_upper", name: "Market Upper Level", nameTa: "சந்தை மேல்தளம்", lat: R4, lng: C4, kind: "entrance", selectable: true },
];

type SegSeed = Omit<Segment, "origin" | "updatedAt"> & { updatedDaysAgo: number };

const segSeeds: SegSeed[] = [
  // --- north side, east–west ---
  { id: "s_bus_r1c2", from: "bus_north", to: "j_r1c2", name: "Bus stop footpath", steps: "none", ramp: "not_needed", surface: "good", widthM: 1.8, slopePct: 1, safeCrossing: "not_applicable", tactilePaving: "yes", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 20 },
  { id: "s_bus_pharmacy", from: "bus_north", to: "pharmacy", name: "North Street footpath", steps: "none", ramp: "not_needed", surface: "fair", widthM: 1.4, slopePct: 2, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "not_applicable", verification: "community", updatedDaysAgo: 35 },
  { id: "s_pharmacy_r1c3", from: "pharmacy", to: "j_r1c3", name: "Pharmacy lane", steps: "none", ramp: "present", surface: "good", widthM: 1.6, slopePct: 3, safeCrossing: "not_applicable", tactilePaving: "unknown", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 25 },
  { id: "s_r1c1_r1c2", from: "j_r1c1", to: "j_r1c2", name: "Main Road north footpath (west)", steps: "none", ramp: "not_needed", surface: "fair", widthM: 1.5, slopePct: 1, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "not_applicable", verification: "community", updatedDaysAgo: 40 },
  { id: "s_r1c2_r1c3", from: "j_r1c2", to: "j_r1c3", name: "Main Road north footpath (east)", steps: "none", ramp: "not_needed", surface: "good", widthM: 1.8, slopePct: 1, safeCrossing: "not_applicable", tactilePaving: "yes", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 18 },
  { id: "s_library_r1c1", from: "library", to: "j_r1c1", name: "Library approach", steps: "none", ramp: "present", surface: "fair", widthM: 1.5, slopePct: 4, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "not_applicable", verification: "community", updatedDaysAgo: 50 },
  { id: "s_r1c3_temple", from: "j_r1c3", to: "temple_tank", name: "Tank Street footpath", steps: "none", ramp: "present", surface: "good", widthM: 1.6, slopePct: 2, safeCrossing: "not_applicable", tactilePaving: "unknown", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 30 },

  // --- crossings of the Main Road ---
  { id: "s_footbridge", from: "j_r1c2", to: "j_r3c2", name: "Footbridge over Main Road", steps: "stairs_only", ramp: "absent", surface: "good", widthM: 1.5, slopePct: null, safeCrossing: "yes", tactilePaving: "no", handrail: "yes", verification: "verified", updatedDaysAgo: 15 },
  { id: "s_west_crossing", from: "j_r1c1", to: "j_r3c1", name: "West signalised crossing", steps: "none", ramp: "present", surface: "fair", widthM: 2.5, slopePct: 6, safeCrossing: "yes", tactilePaving: "unknown", handrail: "not_applicable", verification: "community", updatedDaysAgo: 45 },
  { id: "s_east_crossing", from: "j_r1c3", to: "j_r3c3", name: "East signalised crossing (audible signal)", steps: "none", ramp: "present", surface: "good", widthM: 3, slopePct: 4, safeCrossing: "yes", tactilePaving: "yes", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 12 },

  // --- south side ---
  { id: "s_r3c1_r3c2", from: "j_r3c1", to: "j_r3c2", name: "Main Road south footpath (west)", steps: "none", ramp: "not_needed", surface: "unknown", widthM: null, slopePct: null, safeCrossing: "not_applicable", tactilePaving: "unknown", handrail: "not_applicable", verification: "unverified", updatedDaysAgo: 120 },
  { id: "s_r3c2_r3c3", from: "j_r3c2", to: "j_r3c3", name: "Main Road south footpath (east)", steps: "none", ramp: "not_needed", surface: "good", widthM: 1.8, slopePct: 1, safeCrossing: "not_applicable", tactilePaving: "yes", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 16 },
  { id: "s_r3c2_health", from: "j_r3c2", to: "health_centre", name: "Health Centre approach", steps: "none", ramp: "present", surface: "good", widthM: 2, slopePct: 3, safeCrossing: "not_applicable", tactilePaving: "yes", handrail: "not_applicable", verification: "verified", updatedDaysAgo: 10 },
  { id: "s_r3c1_school", from: "j_r3c1", to: "school", name: "School Road", steps: "none", ramp: "present", surface: "fair", widthM: 1.5, slopePct: 2, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "not_applicable", verification: "community", updatedDaysAgo: 60 },
  { id: "s_school_health", from: "school", to: "health_centre", name: "Clinic Lane", steps: "none", ramp: "not_needed", surface: "poor", widthM: 1.1, slopePct: 2, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "not_applicable", verification: "community", updatedDaysAgo: 55 },
  { id: "s_r3c1_park", from: "j_r3c1", to: "park", name: "Park path (old gate)", steps: "unknown", ramp: "unknown", surface: "unknown", widthM: null, slopePct: null, safeCrossing: "not_applicable", tactilePaving: "unknown", handrail: "unknown", verification: "unverified", updatedDaysAgo: 200 },
  { id: "s_r3c3_market", from: "j_r3c3", to: "market_upper", name: "Market stairs", via: [[R3, C4]], steps: "stairs_only", ramp: "absent", surface: "good", widthM: 1.2, slopePct: null, safeCrossing: "not_applicable", tactilePaving: "no", handrail: "yes", verification: "verified", updatedDaysAgo: 22 },
];

const DAY = 86_400_000;

export function buildSeedGraph(now: number = Date.now()): Graph {
  return {
    areaName: "Mylapore pilot block (synthetic demo data)",
    areaNameTa: "மயிலாப்பூர் முன்னோட்டப் பகுதி (மாதிரி தரவு)",
    center: [(R0 + R4) / 2, (C0 + C4) / 2],
    nodes: nodes.map((n) => ({ ...n })),
    segments: segSeeds.map(({ updatedDaysAgo, ...s }) => ({
      ...s,
      origin: "synthetic_demo",
      updatedAt: new Date(now - updatedDaysAgo * DAY).toISOString(),
    })),
  };
}

interface ReportSeed {
  id: string;
  lat: number;
  lng: number;
  segmentId: string;
  category: BarrierReport["category"];
  severity: BarrierReport["severity"];
  status: BarrierReport["status"];
  description: string;
  createdDaysAgo: number;
  lastVerifiedDaysAgo: number;
  ai?: { confidence: number; category?: BarrierReport["category"] };
  votes?: { action: "confirm" | "dispute" | "resolve"; daysAgo: number }[];
}

const reportSeeds: ReportSeed[] = [
  {
    id: "demo-r1",
    lat: (R1 + R3) / 2,
    lng: C2,
    segmentId: "s_footbridge",
    category: "stairs",
    severity: "impassable",
    status: "confirmed",
    description: "Footbridge has 28 steps on each side and no lift or ramp. (Synthetic demo report.)",
    createdDaysAgo: 40,
    lastVerifiedDaysAgo: 6,
    ai: { confidence: 0.93 },
    votes: [{ action: "confirm", daysAgo: 30 }, { action: "confirm", daysAgo: 6 }],
  },
  {
    id: "demo-r2",
    lat: R3,
    lng: (C1 + C2) / 2,
    segmentId: "s_r3c1_r3c2",
    category: "construction_debris",
    severity: "medium",
    status: "pending",
    description: "Sand and bricks piled on half the footpath near the corner. (Synthetic demo report.)",
    createdDaysAgo: 1,
    lastVerifiedDaysAgo: 1,
    ai: { confidence: 0.71 },
  },
  {
    id: "demo-r3",
    lat: R1,
    lng: (C0 + C1) / 2,
    segmentId: "s_library_r1c1",
    category: "waterlogging",
    severity: "high",
    status: "confirmed",
    description: "Ankle-deep water after rain at the library approach. (Synthetic demo report.)",
    createdDaysAgo: 6,
    lastVerifiedDaysAgo: 5,
    ai: { confidence: 0.88 },
    votes: [{ action: "confirm", daysAgo: 5 }, { action: "confirm", daysAgo: 5 }],
  },
  {
    id: "demo-r4",
    lat: R1,
    lng: (C3 + C4) / 2,
    segmentId: "s_r1c3_temple",
    category: "blocked_ramp",
    severity: "medium",
    status: "disputed",
    description: "Two-wheelers parked across the kerb ramp. (Synthetic demo report.)",
    createdDaysAgo: 3,
    lastVerifiedDaysAgo: 3,
    ai: { confidence: 0.64 },
    votes: [{ action: "confirm", daysAgo: 2 }, { action: "dispute", daysAgo: 2 }, { action: "dispute", daysAgo: 1 }],
  },
  {
    id: "demo-r5",
    lat: (R0 + R1) / 2,
    lng: C2,
    segmentId: "s_bus_r1c2",
    category: "broken_footpath",
    severity: "medium",
    status: "resolved",
    description: "Broken slab near the bus shelter (since repaired). (Synthetic demo report.)",
    createdDaysAgo: 28,
    lastVerifiedDaysAgo: 4,
    ai: { confidence: 0.82 },
    votes: [{ action: "confirm", daysAgo: 27 }, { action: "confirm", daysAgo: 26 }, { action: "resolve", daysAgo: 5 }, { action: "resolve", daysAgo: 4 }],
  },
  {
    id: "demo-r6",
    lat: R0,
    lng: (C2 + C3) / 2,
    segmentId: "s_bus_pharmacy",
    category: "broken_footpath",
    severity: "high",
    status: "confirmed",
    description: "Missing slabs leave a 15 cm drop along the footpath. (Synthetic demo report.)",
    createdDaysAgo: 12,
    lastVerifiedDaysAgo: 3,
    ai: { confidence: 0.79 },
    votes: [{ action: "confirm", daysAgo: 10 }, { action: "confirm", daysAgo: 3 }],
  },
  {
    id: "demo-r7",
    lat: (R3 + R4) / 2,
    lng: (C1 + C2) / 2,
    segmentId: "s_school_health",
    category: "broken_footpath",
    severity: "medium",
    status: "confirmed",
    description: "Uneven paving and a narrow section along Clinic Lane. (Synthetic demo report.)",
    createdDaysAgo: 20,
    lastVerifiedDaysAgo: 9,
    ai: { confidence: 0.76 },
    votes: [{ action: "confirm", daysAgo: 15 }, { action: "confirm", daysAgo: 9 }],
  },
];

export function buildSeedReports(now: number = Date.now()): BarrierReport[] {
  const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();
  return reportSeeds.map((r) => {
    const createdAt = iso(r.createdDaysAgo);
    const votes = (r.votes ?? []).map((v, i) => ({ clientId: `seed-voter-${r.id}-${i}`, action: v.action, at: iso(v.daysAgo) }));
    const history: BarrierReport["history"] = [
      { at: createdAt, from: null, to: "pending", by: "system", note: "Report created (synthetic demo data)." },
    ];
    if (r.status !== "pending") {
      history.push({ at: iso(r.lastVerifiedDaysAgo), from: "pending", to: r.status, by: "community", note: "Seeded status for demonstration." });
    }
    const lastUpdate = Math.min(r.createdDaysAgo, r.lastVerifiedDaysAgo, ...(r.votes ?? []).map((v) => v.daysAgo));
    return {
      id: r.id,
      lat: r.lat,
      lng: r.lng,
      segmentId: r.segmentId,
      category: r.category,
      severity: r.severity,
      description: r.description,
      status: r.status,
      origin: "synthetic_demo",
      ai: r.ai
        ? {
            category: r.ai.category ?? r.category,
            severity: r.severity,
            confidence: r.ai.confidence,
            explanation: "Demo prediction seeded for illustration — not real model inference.",
            uncertainty: "",
            provider: "demo",
            isDemo: true,
          }
        : null,
      userCorrectedAi: false,
      hasPhoto: false,
      reporterId: `seed-reporter-${r.id}`,
      votes,
      history,
      createdAt,
      updatedAt: iso(lastUpdate),
      lastVerifiedAt: iso(r.lastVerifiedDaysAgo),
      language: "en",
    } satisfies BarrierReport;
  });
}
