import { freshness, tallies } from "@/lib/reports";
import type { BarrierReport } from "@/lib/types";

/** Shape sent to browsers: anonymous device ids are removed; freshness + tallies are added. */
export function toPublic(r: BarrierReport, viewerId?: string) {
  const { votes, reporterId, ...rest } = r;
  const f = freshness(r);
  return {
    ...rest,
    freshness: { ageDays: Math.round(f.ageDays * 10) / 10, stale: f.stale, halfLifeDays: Number.isFinite(f.halfLifeDays) ? f.halfLifeDays : null },
    tallies: tallies(r),
    isMine: viewerId ? reporterId === viewerId : undefined,
    myVotes: viewerId ? votes.filter((v) => v.clientId === viewerId).map((v) => v.action) : undefined,
  };
}
export type PublicReport = ReturnType<typeof toPublic>;
