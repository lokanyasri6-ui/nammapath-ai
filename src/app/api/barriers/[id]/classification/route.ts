import { handle, NextResponse } from "../../../_handle";
import { jsonError, readJson, zodMessage } from "@/lib/server/guards";
import { correctClassification } from "@/lib/server/services";
import { ClassificationUpdateSchema } from "@/lib/types";
import { toPublic } from "../../public";

/** PATCH /api/barriers/:id/classification — reporter confirms/corrects the category while pending. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const { id } = await ctx.params;
    const parsed = ClassificationUpdateSchema.safeParse(await readJson(req, 2_000));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const r = await correctClassification(id, parsed.data.category, parsed.data.severity, parsed.data.clientId);
    return NextResponse.json({ report: toPublic(r, parsed.data.clientId) });
  });
}
