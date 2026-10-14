import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { buildSeedGraph } from "../seed";
import type { BarrierReport, Graph, GraphNode, Segment } from "../types";
import { validateDataUrl } from "../upload";
import { StoreUnavailableError, type ReportFilter, type Store } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

type Row = Record<string, any>;

export class SupabaseStore implements Store {
  readonly mode = "supabase" as const;
  private db: SupabaseClient;
  private bucket: string;
  private graphCache: { at: number; value: { graph: Graph; source: "seed" | "database" } } | null = null;

  constructor(url: string, serviceKey: string, bucket = "report-photos") {
    this.db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    this.bucket = bucket;
  }

  private fail(e: unknown): never {
    console.error("[supabase]", e);
    throw new StoreUnavailableError("The report database is temporarily unavailable.");
  }

  async getGraph() {
    if (this.graphCache && Date.now() - this.graphCache.at < 60_000) return this.graphCache.value;
    const [{ data: nodes, error: e1 }, { data: segs, error: e2 }] = await Promise.all([
      this.db.from("pedestrian_nodes").select("*"),
      this.db.from("pedestrian_segments").select("*"),
    ]);
    if (e1 || e2) this.fail(e1 ?? e2);
    let value: { graph: Graph; source: "seed" | "database" };
    if (!nodes?.length || !segs?.length) {
      value = { graph: buildSeedGraph(), source: "seed" };
    } else {
      const seed = buildSeedGraph();
      const gNodes: GraphNode[] = nodes.map((n: Row) => ({
        id: n.id, name: n.name, nameTa: n.name_ta || n.name, lat: n.lat, lng: n.lng, kind: n.kind, selectable: n.selectable,
      }));
      const lats = gNodes.map((n) => n.lat);
      const lngs = gNodes.map((n) => n.lng);
      value = {
        source: "database",
        graph: {
          areaName: process.env.PILOT_AREA_NAME || seed.areaName,
          areaNameTa: process.env.PILOT_AREA_NAME_TA || seed.areaNameTa,
          center: [(Math.min(...lats) + Math.max(...lats)) / 2, (Math.min(...lngs) + Math.max(...lngs)) / 2],
          nodes: gNodes,
          segments: segs.map(
            (s: Row): Segment => ({
              id: s.id, from: s.from_node, to: s.to_node, via: s.via ?? undefined, name: s.name, steps: s.steps, ramp: s.ramp,
              surface: s.surface, widthM: s.width_m === null ? null : Number(s.width_m), slopePct: s.slope_pct === null ? null : Number(s.slope_pct),
              safeCrossing: s.safe_crossing, tactilePaving: s.tactile_paving, handrail: s.handrail, verification: s.verification,
              origin: s.origin, updatedAt: s.updated_at,
            }),
          ),
        },
      };
    }
    this.graphCache = { at: Date.now(), value };
    return value;
  }

  async listReports(filter?: ReportFilter) {
    let q = this.db
      .from("barrier_reports")
      .select("*, report_votes(client_id, action, created_at), report_status_history(from_status, to_status, actor, note, created_at)")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (filter?.status?.length) q = q.in("status", filter.status);
    if (filter?.category) q = q.eq("category", filter.category);
    const { data, error } = await q;
    if (error) this.fail(error);
    return (data ?? []).map(fromRow);
  }

  async getReport(id: string) {
    const { data, error } = await this.db
      .from("barrier_reports")
      .select("*, report_votes(client_id, action, created_at), report_status_history(from_status, to_status, actor, note, created_at)")
      .eq("id", id)
      .maybeSingle();
    if (error) this.fail(error);
    return data ? fromRow(data) : null;
  }

  async insertReport(report: BarrierReport, photoDataUrl: string | null) {
    let photoPath: string | null = null;
    if (photoDataUrl) {
      const img = validateDataUrl(photoDataUrl);
      const ext = img.mime === "image/png" ? "png" : img.mime === "image/webp" ? "webp" : "jpg";
      photoPath = `${report.id}.${ext}`;
      const { error } = await this.db.storage.from(this.bucket).upload(photoPath, img.bytes, { contentType: img.mime, upsert: false });
      if (error) {
        console.error("[supabase storage]", error);
        photoPath = null; // keep the report even if the photo upload fails
      }
    }
    const { error } = await this.db.from("barrier_reports").insert(toRow({ ...report, hasPhoto: !!photoPath }, photoPath));
    if (error) this.fail(error);
    await this.syncChildren(report);
    return { ...report, hasPhoto: !!photoPath };
  }

  async updateReport(report: BarrierReport) {
    const { photo_path: _ignored, ...row } = toRow(report, null);
    const { error } = await this.db.from("barrier_reports").update(row).eq("id", report.id);
    if (error) this.fail(error);
    await this.syncChildren(report);
    return report;
  }

  private async syncChildren(report: BarrierReport) {
    if (report.votes.length) {
      const { error } = await this.db.from("report_votes").upsert(
        report.votes.map((v) => ({ report_id: report.id, client_id: v.clientId, action: v.action, created_at: v.at })),
        { onConflict: "report_id,client_id,action,created_at", ignoreDuplicates: true },
      );
      if (error) this.fail(error);
    }
    const { error } = await this.db.from("report_status_history").upsert(
      report.history.map((h) => ({ report_id: report.id, from_status: h.from, to_status: h.to, actor: h.by, note: h.note, created_at: h.at })),
      { onConflict: "report_id,created_at,to_status", ignoreDuplicates: true },
    );
    if (error) this.fail(error);
  }

  async getPhotoUrl(id: string) {
    const { data, error } = await this.db.from("barrier_reports").select("photo_path").eq("id", id).maybeSingle();
    if (error) this.fail(error);
    if (!data?.photo_path) return null;
    const signed = await this.db.storage.from(this.bucket).createSignedUrl(data.photo_path, 300);
    return signed.data?.signedUrl ?? null;
  }
}

function toRow(r: BarrierReport, photoPath: string | null): Row {
  return {
    id: r.id, lat: r.lat, lng: r.lng, segment_id: r.segmentId, category: r.category, severity: r.severity,
    description: r.description, status: r.status, origin: r.origin,
    ai_category: r.ai?.category ?? null, ai_severity: r.ai?.severity ?? null, ai_confidence: r.ai?.confidence ?? null,
    ai_explanation: r.ai?.explanation ?? null, ai_uncertainty: r.ai?.uncertainty ?? null, ai_provider: r.ai?.provider ?? null,
    ai_is_demo: r.ai?.isDemo ?? null, user_corrected_ai: r.userCorrectedAi, photo_path: photoPath, reporter_id: r.reporterId,
    language: r.language, created_at: r.createdAt, updated_at: r.updatedAt, last_verified_at: r.lastVerifiedAt,
  };
}

function fromRow(row: Row): BarrierReport {
  const votes = (row.report_votes ?? []) as Row[];
  const hist = ((row.report_status_history ?? []) as Row[]).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  return {
    id: row.id, lat: row.lat, lng: row.lng, segmentId: row.segment_id, category: row.category, severity: row.severity,
    description: row.description, status: row.status, origin: row.origin,
    ai: row.ai_category
      ? {
          category: row.ai_category, severity: row.ai_severity, confidence: Number(row.ai_confidence),
          explanation: row.ai_explanation ?? "", uncertainty: row.ai_uncertainty ?? "", provider: row.ai_provider, isDemo: !!row.ai_is_demo,
        }
      : null,
    userCorrectedAi: row.user_corrected_ai, hasPhoto: !!row.photo_path, reporterId: row.reporter_id,
    votes: votes.map((v) => ({ clientId: v.client_id, action: v.action, at: new Date(v.created_at).toISOString() })),
    history: hist.map((h) => ({ at: new Date(h.created_at).toISOString(), from: h.from_status, to: h.to_status, by: h.actor, note: h.note })),
    createdAt: new Date(row.created_at).toISOString(), updatedAt: new Date(row.updated_at).toISOString(),
    lastVerifiedAt: new Date(row.last_verified_at).toISOString(), language: row.language,
  };
}
