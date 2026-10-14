/**
 * Report lifecycle rules — pure functions, shared by the in-memory store,
 * the Supabase store and the tests.
 *
 * VERIFICATION POLICY (shown to users on /reports):
 *  - Every new report starts as PENDING, whatever the AI says.
 *    A single AI prediction never makes a barrier "confirmed".
 *  - CONFIRMED  : 2 independent confirmations (the original reporter does not count), or a moderator.
 *  - DISPUTED   : 2+ disputes and disputes ≥ confirmations, or a moderator.
 *  - RESOLVED   : 2 "it's fixed" reports, or a moderator.
 *  - A "still there" confirmation on a RESOLVED report re-opens it as PENDING.
 *  - Each anonymous device can vote once per action per report.
 *  - Temporary barriers go STALE after one half-life (see categories.ts) and ask for re-verification;
 *    routing then treats them as uncertain rather than certain.
 */
import { CATEGORIES } from "./categories";
import type { BarrierReport, ReportStatus, Vote } from "./types";

export const CONFIRM_THRESHOLD = 2;
export const DISPUTE_THRESHOLD = 2;
export const RESOLVE_THRESHOLD = 2;

export class ReportRuleError extends Error {
  constructor(message: string, public readonly code: "duplicate_vote" | "own_report" | "invalid_transition") {
    super(message);
  }
}

function count(votes: Vote[], action: Vote["action"], since?: string) {
  return votes.filter((v) => v.action === action && (!since || v.at >= since)).length;
}

/** Apply a community action and return the updated report (does not mutate the input). */
export function applyCommunityAction(
  report: BarrierReport,
  action: Vote["action"],
  clientId: string,
  now: Date = new Date(),
): BarrierReport {
  if (clientId === report.reporterId && action === "confirm") {
    throw new ReportRuleError("You reported this barrier, so your confirmation can't count. Ask someone else to verify it.", "own_report");
  }
  // One vote per device per action, counted since the last status change (so a re-opened report can be re-verified).
  const lastChange = report.history[report.history.length - 1]?.at;
  if (report.votes.some((v) => v.clientId === clientId && v.action === action && (!lastChange || v.at >= lastChange))) {
    throw new ReportRuleError("You have already recorded this response for this report.", "duplicate_vote");
  }

  const at = now.toISOString();
  const votes = [...report.votes, { clientId, action, at }];
  const next: BarrierReport = { ...report, votes, updatedAt: at };
  const since = lastChange;

  const confirms = count(votes, "confirm", since);
  const disputes = count(votes, "dispute", since);
  const resolves = count(votes, "resolve", since);

  let to: ReportStatus = report.status;
  let note = "";

  if (action === "confirm") {
    next.lastVerifiedAt = at;
    if (report.status === "resolved") {
      to = "pending";
      note = "Someone reported the barrier is back / still present. Re-opened for verification.";
    } else if (report.status !== "confirmed" && confirms >= CONFIRM_THRESHOLD && confirms > disputes) {
      to = "confirmed";
      note = `${confirms} independent confirmations.`;
    }
  } else if (action === "dispute") {
    if (report.status !== "resolved" && disputes >= DISPUTE_THRESHOLD && disputes >= confirms) {
      to = "disputed";
      note = `${disputes} people disputed this report.`;
    }
  } else if (action === "resolve") {
    if (report.status !== "resolved" && resolves >= RESOLVE_THRESHOLD) {
      to = "resolved";
      note = `${resolves} people reported it fixed.`;
    }
  }

  if (to !== report.status) {
    next.status = to;
    next.history = [...report.history, { at, from: report.status, to, by: "community", note }];
  }
  return next;
}

/** Moderator override — any status, always logged. */
export function applyModeratorStatus(report: BarrierReport, to: ReportStatus, note: string, now = new Date()): BarrierReport {
  if (to === report.status) throw new ReportRuleError(`Report is already ${to}.`, "invalid_transition");
  const at = now.toISOString();
  return {
    ...report,
    status: to,
    updatedAt: at,
    lastVerifiedAt: to === "confirmed" ? at : report.lastVerifiedAt,
    history: [...report.history, { at, from: report.status, to, by: "moderator", note: note || "Moderator decision." }],
  };
}

/** Vote tallies since the last status change — used for "1 of 2 confirmations" progress UI. */
export function tallies(report: BarrierReport) {
  const since = report.history[report.history.length - 1]?.at;
  return {
    confirms: count(report.votes, "confirm", since),
    disputes: count(report.votes, "dispute", since),
    resolves: count(report.votes, "resolve", since),
  };
}

/* ------------------------------------------------------------------ */
/* Freshness                                                           */
/* ------------------------------------------------------------------ */

export interface Freshness {
  ageDays: number;
  /** 1 = just verified, decays toward 0 for temporary barriers. Structural barriers stay 1. */
  weight: number;
  stale: boolean;
  halfLifeDays: number;
}

export function freshness(report: Pick<BarrierReport, "category" | "lastVerifiedAt">, now: Date = new Date()): Freshness {
  const halfLifeDays = CATEGORIES[report.category].halfLifeDays;
  const ageDays = Math.max(0, (now.getTime() - new Date(report.lastVerifiedAt).getTime()) / 86_400_000);
  if (!Number.isFinite(halfLifeDays)) return { ageDays, weight: 1, stale: ageDays > 365, halfLifeDays };
  const weight = Math.pow(0.5, ageDays / halfLifeDays);
  return { ageDays, weight, stale: ageDays > halfLifeDays, halfLifeDays };
}

/**
 * How routing should treat a report right now.
 *  - "block"     : confirmed, fresh and severe enough to make a segment unusable for the profile
 *  - "certain"   : confirmed and fresh → full penalty
 *  - "uncertain" : pending / disputed / stale → partial penalty + shown as uncertainty
 *  - "ignore"    : resolved
 */
export type RoutingEffect = "certain" | "uncertain" | "ignore";

export function routingEffect(report: BarrierReport, now: Date = new Date()): RoutingEffect {
  if (report.status === "resolved") return "ignore";
  if (report.status === "confirmed") return freshness(report, now).stale ? "uncertain" : "certain";
  return "uncertain";
}
