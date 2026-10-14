import { buildSeedGraph, buildSeedReports } from "../seed";
import type { BarrierReport, Graph } from "../types";
import type { ReportFilter, Store } from "./types";

/**
 * In-memory store used in DEMO MODE (no Supabase configured).
 * Seeded with synthetic data. Data lives only as long as the server process —
 * restarting the dev server resets it. On serverless hosting each instance
 * has its own copy, so use Supabase for anything beyond a live demo.
 */
export class MemoryStore implements Store {
  readonly mode = "memory" as const;
  private graph: Graph;
  private reports = new Map<string, BarrierReport>();
  private photos = new Map<string, string>();

  constructor(now: number = Date.now(), opts: { empty?: boolean } = {}) {
    this.graph = buildSeedGraph(now);
    if (!opts.empty) for (const r of buildSeedReports(now)) this.reports.set(r.id, r);
  }

  async getGraph() {
    return { graph: this.graph, source: "seed" as const };
  }

  async listReports(filter?: ReportFilter) {
    let list = [...this.reports.values()];
    if (filter?.status?.length) list = list.filter((r) => filter.status!.includes(r.status));
    if (filter?.category) list = list.filter((r) => r.category === filter.category);
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map(clone);
  }

  async getReport(id: string) {
    const r = this.reports.get(id);
    return r ? clone(r) : null;
  }

  async insertReport(report: BarrierReport, photoDataUrl: string | null) {
    this.reports.set(report.id, clone(report));
    if (photoDataUrl) this.photos.set(report.id, photoDataUrl);
    return clone(report);
  }

  async updateReport(report: BarrierReport) {
    if (!this.reports.has(report.id)) throw new Error("Report not found");
    this.reports.set(report.id, clone(report));
    return clone(report);
  }

  async getPhotoUrl(id: string) {
    return this.photos.get(id) ?? null;
  }
}

function clone<T>(v: T): T {
  return structuredClone(v);
}
