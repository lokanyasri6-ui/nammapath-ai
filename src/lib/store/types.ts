import type { BarrierReport, Graph } from "../types";

export interface ReportFilter {
  status?: BarrierReport["status"][];
  category?: BarrierReport["category"];
}

export interface Store {
  readonly mode: "memory" | "supabase";
  getGraph(): Promise<{ graph: Graph; source: "seed" | "database" }>;
  listReports(filter?: ReportFilter): Promise<BarrierReport[]>;
  getReport(id: string): Promise<BarrierReport | null>;
  insertReport(report: BarrierReport, photoDataUrl: string | null): Promise<BarrierReport>;
  updateReport(report: BarrierReport): Promise<BarrierReport>;
  /** Returns a short-lived URL (Supabase) or a data URL (memory) for the report photo. */
  getPhotoUrl(id: string): Promise<string | null>;
}

export class StoreUnavailableError extends Error {}
