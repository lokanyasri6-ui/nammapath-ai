import { handle, noStore, NextResponse } from "../../_handle";
import { getReport } from "@/lib/server/services";
import { toPublic } from "../public";

export const dynamic = "force-dynamic";

/** GET /api/barriers/:id?viewer=<clientId> */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const viewer = new URL(req.url).searchParams.get("viewer") ?? undefined;
    return NextResponse.json({ report: toPublic(await getReport(id), viewer) }, noStore);
  });
}
