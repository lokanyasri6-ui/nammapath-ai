import { handle, noStore, NextResponse } from "../../../_handle";
import { jsonError } from "@/lib/server/guards";
import { photoUrl } from "@/lib/server/services";

export const dynamic = "force-dynamic";

/** GET /api/barriers/:id/photo — short-lived signed URL (Supabase) or data URL (demo store). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const url = await photoUrl(id);
    if (!url) return jsonError(404, "No photo for this report.");
    return NextResponse.json({ url }, noStore);
  });
}
