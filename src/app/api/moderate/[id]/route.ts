import { handle, NextResponse } from "../../_handle";
import { isModerator, jsonError, readJson, zodMessage } from "@/lib/server/guards";
import { moderate } from "@/lib/server/services";
import { ModerateSchema } from "@/lib/types";
import { toPublic } from "../../barriers/public";

/** POST /api/moderate/:id  (header x-moderator-token)  { status, note } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    if (!isModerator(req)) return jsonError(401, "Moderator access required.");
    const { id } = await ctx.params;
    const parsed = ModerateSchema.safeParse(await readJson(req, 2_000));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const r = await moderate(id, parsed.data.status, parsed.data.note);
    return NextResponse.json({ report: toPublic(r) });
  });
}
