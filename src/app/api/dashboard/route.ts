import { handle, noStore, NextResponse } from "../_handle";
import { dashboard } from "@/lib/server/services";
import { toPublic } from "../barriers/public";

export const dynamic = "force-dynamic";

/** GET /api/dashboard — aggregate statistics computed from the live report store. */
export async function GET() {
  return handle(async () => {
    const { stats, graphSource, storeMode } = await dashboard();
    return NextResponse.json(
      {
        ...stats,
        recent: stats.recent.map((r) => toPublic(r)),
        needsReverification: stats.needsReverification.map((r) => toPublic(r)),
        graphSource,
        storeMode,
      },
      noStore,
    );
  });
}
