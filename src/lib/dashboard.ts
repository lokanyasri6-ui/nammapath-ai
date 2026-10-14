import { CATEGORIES } from "./categories";
import { freshness } from "./reports";
import type { BarrierReport, CategoryId, Graph } from "./types";

export interface DashboardStats {
  totals: { all: number; pending: number; confirmedActive: number; disputed: number; resolved: number; stale: number };
  byCategory: { category: CategoryId; label: string; labelTa: string; count: number; active: number }[];
  hotspots: { segmentId: string; name: string; lat: number; lng: number; count: number; active: number; categories: CategoryId[] }[];
  trend: { weekStart: string; created: number; resolved: number }[];
  recent: BarrierReport[];
  needsReverification: BarrierReport[];
  aiStats: { withAi: number; corrected: number; demo: number; avgConfidence: number | null };
  dataOrigin: { synthetic: number; community: number; verified: number };
  medianDaysToResolve: number | null;
}

const DAY = 86_400_000;

export function computeDashboard(reports: BarrierReport[], graph: Graph, now: Date = new Date()): DashboardStats {
  const segById = new Map(graph.segments.map((s) => [s.id, s]));
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const stale = reports.filter((r) => r.status !== "resolved" && freshness(r, now).stale);

  const byCategory = (Object.keys(CATEGORIES) as CategoryId[])
    .map((c) => ({
      category: c,
      label: CATEGORIES[c].en,
      labelTa: CATEGORIES[c].ta,
      count: reports.filter((r) => r.category === c).length,
      active: reports.filter((r) => r.category === c && r.status !== "resolved").length,
    }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const hotMap = new Map<string, { count: number; active: number; cats: Set<CategoryId> }>();
  for (const r of reports) {
    const key = r.segmentId ?? `pt:${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
    const e = hotMap.get(key) ?? { count: 0, active: 0, cats: new Set<CategoryId>() };
    e.count++;
    if (r.status !== "resolved") e.active++;
    e.cats.add(r.category);
    hotMap.set(key, e);
  }
  const hotspots = [...hotMap.entries()]
    .map(([key, e]) => {
      const seg = segById.get(key);
      let lat = 0, lng = 0, name = "Unmapped location";
      if (seg) {
        const a = nodeById.get(seg.from)!, b = nodeById.get(seg.to)!;
        lat = (a.lat + b.lat) / 2; lng = (a.lng + b.lng) / 2; name = seg.name;
      } else {
        const r = reports.find((x) => `pt:${x.lat.toFixed(4)},${x.lng.toFixed(4)}` === key)!;
        lat = r.lat; lng = r.lng; name = `Near ${r.lat.toFixed(4)}, ${r.lng.toFixed(4)}`;
      }
      return { segmentId: key, name, lat, lng, count: e.count, active: e.active, categories: [...e.cats] };
    })
    .sort((a, b) => b.active - a.active || b.count - a.count)
    .slice(0, 6);

  // Weekly trend over the last 8 weeks
  const weekStart = (d: Date) => {
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
    return x;
  };
  const thisWeek = weekStart(now);
  const trend = Array.from({ length: 8 }, (_, i) => {
    const start = new Date(thisWeek.getTime() - (7 - i) * 7 * DAY);
    const end = new Date(start.getTime() + 7 * DAY);
    const inWeek = (iso: string) => iso >= start.toISOString() && iso < end.toISOString();
    return {
      weekStart: start.toISOString().slice(0, 10),
      created: reports.filter((r) => inWeek(r.createdAt)).length,
      resolved: reports.filter((r) => r.history.some((h) => h.to === "resolved" && inWeek(h.at))).length,
    };
  });

  const resolvedDurations = reports
    .filter((r) => r.status === "resolved")
    .map((r) => {
      const h = [...r.history].reverse().find((x) => x.to === "resolved");
      return h ? (new Date(h.at).getTime() - new Date(r.createdAt).getTime()) / DAY : null;
    })
    .filter((x): x is number => x !== null)
    .sort((a, b) => a - b);

  const withAi = reports.filter((r) => r.ai);
  return {
    totals: {
      all: reports.length,
      pending: reports.filter((r) => r.status === "pending").length,
      confirmedActive: reports.filter((r) => r.status === "confirmed").length,
      disputed: reports.filter((r) => r.status === "disputed").length,
      resolved: reports.filter((r) => r.status === "resolved").length,
      stale: stale.length,
    },
    byCategory,
    hotspots,
    trend,
    recent: [...reports].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    needsReverification: stale.slice(0, 6),
    aiStats: {
      withAi: withAi.length,
      corrected: reports.filter((r) => r.userCorrectedAi).length,
      demo: withAi.filter((r) => r.ai!.isDemo).length,
      avgConfidence: withAi.length ? Math.round((withAi.reduce((s, r) => s + r.ai!.confidence, 0) / withAi.length) * 100) / 100 : null,
    },
    dataOrigin: {
      synthetic: reports.filter((r) => r.origin === "synthetic_demo").length,
      community: reports.filter((r) => r.origin === "community").length,
      verified: reports.filter((r) => r.origin === "verified_survey").length,
    },
    medianDaysToResolve: resolvedDurations.length ? Math.round(resolvedDurations[Math.floor(resolvedDurations.length / 2)] * 10) / 10 : null,
  };
}

/**
 * Plain-text summary a volunteer can paste into a civic complaint
 * (e.g. a municipal grievance portal). We do NOT submit anything automatically.
 */
export function civicSummary(
  hotspot: DashboardStats["hotspots"][number],
  reports: Pick<BarrierReport, "segmentId" | "lat" | "lng" | "status" | "category" | "severity" | "createdAt" | "lastVerifiedAt">[],
  isDemo: boolean,
): string {
  const key = (r: (typeof reports)[number]) => r.segmentId ?? `pt:${r.lat.toFixed(4)},${r.lng.toFixed(4)}`;
  const items = reports.filter((r) => key(r) === hotspot.segmentId && r.status !== "resolved");
  const lines = [
    `Subject: Pedestrian accessibility barrier — ${hotspot.name}`,
    "",
    `Location: ${hotspot.name} (approx. ${hotspot.lat.toFixed(5)}, ${hotspot.lng.toFixed(5)})`,
    `Open reports: ${items.length}`,
    ...items.map(
      (r) =>
        `- ${CATEGORIES[r.category].en} (severity: ${r.severity}, status: ${r.status}, first reported ${r.createdAt.slice(0, 10)}, last verified ${r.lastVerifiedAt.slice(0, 10)})`,
    ),
    "",
    "This barrier affects wheelchair users, people with walking aids, older pedestrians and people with low vision.",
    "Requested action: please inspect and restore a safe, step-free walking surface.",
    "",
    "Compiled from community reports on NammaPath AI.",
  ];
  if (isDemo) lines.push("NOTE: generated from SYNTHETIC DEMO DATA — do not submit to any authority.");
  return lines.join("\n");
}
