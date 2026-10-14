import { handle, noStore, NextResponse } from "../_handle";
import { getGraph } from "@/lib/server/services";

export const dynamic = "force-dynamic";

/** GET /api/graph — pilot-area nodes and footpath segments. */
export async function GET() {
  return handle(async () => {
    const { graph, source } = await getGraph();
    return NextResponse.json({ graph, source }, noStore);
  });
}
