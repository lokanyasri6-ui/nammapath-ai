import { randomUUID } from "node:crypto";
import { computeDashboard } from "../dashboard";
import { applyCommunityAction, applyModeratorStatus } from "../reports";
import { findRoutes, nearestSegment } from "../routing";
import { getStore } from "../store";
import type { BarrierReport, CategoryId, CreateReportInput, ProfileId, ReportStatus, Severity, Vote } from "../types";
import { validateDataUrl } from "../upload";

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}

export function systemStatus() {
  const aiConfigured = !!process.env.GEMINI_API_KEY?.trim();
  const dbConfigured = !!(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
  return {
    ai: aiConfigured ? { mode: "live" as const, provider: "gemini", model: process.env.GEMINI_MODEL || "gemini-2.5-flash" } : { mode: "demo" as const, provider: "demo", model: "demo-deterministic-v1" },
    database: dbConfigured ? { mode: "supabase" as const } : { mode: "memory" as const },
  };
}

export async function getGraph() {
  return getStore().getGraph();
}

export async function listReports(status?: ReportStatus[], category?: CategoryId) {
  return getStore().listReports({ status, category });
}

export async function getReport(id: string) {
  const r = await getStore().getReport(id);
  if (!r) throw new NotFoundError("Report not found.");
  return r;
}

export async function createReport(input: CreateReportInput): Promise<BarrierReport> {
  const store = getStore();
  const photo = input.photo ? validateDataUrl(input.photo) : null; // throws UploadError
  const { graph } = await store.getGraph();
  const snap = nearestSegment(graph, input.lat, input.lng, 60);
  const now = new Date().toISOString();
  const ai = input.ai;
  const report: BarrierReport = {
    id: randomUUID(),
    lat: input.lat,
    lng: input.lng,
    segmentId: snap?.segmentId ?? null,
    category: input.category,
    severity: input.severity,
    description: input.description,
    status: "pending", // ALWAYS pending — AI predictions never auto-confirm
    origin: "community",
    ai,
    userCorrectedAi: !!ai && (ai.category !== input.category || ai.severity !== input.severity),
    hasPhoto: !!photo,
    reporterId: input.clientId,
    votes: [],
    history: [
      {
        at: now,
        from: null,
        to: "pending",
        by: "system",
        note: ai
          ? `Created with ${ai.isDemo ? "a DEMO (simulated)" : "an AI"} prediction at ${Math.round(ai.confidence * 100)}% confidence; awaiting community verification.`
          : "Created manually; awaiting community verification.",
      },
    ],
    createdAt: now,
    updatedAt: now,
    lastVerifiedAt: now,
    language: input.language,
  };
  return store.insertReport(report, photo ? input.photo : null);
}

export async function actOnReport(id: string, action: Vote["action"], clientId: string) {
  const store = getStore();
  const r = await getReport(id);
  const next = applyCommunityAction(r, action, clientId); // throws ReportRuleError
  return store.updateReport(next);
}

export async function correctClassification(id: string, category: CategoryId, severity: Severity, clientId: string) {
  const store = getStore();
  const r = await getReport(id);
  if (r.reporterId !== clientId) throw new ForbiddenError("Only the original reporter can correct the classification. Others can dispute it.");
  if (r.status !== "pending") throw new ForbiddenError("The classification can only be corrected while the report is pending.");
  const now = new Date().toISOString();
  return store.updateReport({
    ...r,
    category,
    severity,
    userCorrectedAi: !!r.ai && (r.ai.category !== category || r.ai.severity !== severity),
    updatedAt: now,
  });
}

export async function moderate(id: string, status: ReportStatus, note: string) {
  const store = getStore();
  const r = await getReport(id);
  return store.updateReport(applyModeratorStatus(r, status, note));
}

export async function route(from: string, to: string, profile: ProfileId) {
  const store = getStore();
  const [{ graph }, reports] = await Promise.all([store.getGraph(), store.listReports()]);
  return findRoutes(graph, reports, from, to, profile);
}

export async function dashboard() {
  const store = getStore();
  const [{ graph, source }, reports] = await Promise.all([store.getGraph(), store.listReports()]);
  return { stats: computeDashboard(reports, graph), graphSource: source, storeMode: store.mode };
}

export async function photoUrl(id: string) {
  return getStore().getPhotoUrl(id);
}
