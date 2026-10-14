import { handle, NextResponse } from "../../../_handle";
import { clientIp, jsonError, rateLimit, readJson, zodMessage } from "@/lib/server/guards";
import { actOnReport } from "@/lib/server/services";
import { ReportActionSchema } from "@/lib/types";
import { toPublic } from "../../public";

/** POST /api/barriers/:id/actions  { action: "confirm" | "dispute" | "resolve", clientId } */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    if (!rateLimit(`vote:${clientIp(req)}`, 30)) return jsonError(429, "Too many actions. Please wait a minute.");
    const { id } = await ctx.params;
    const parsed = ReportActionSchema.safeParse(await readJson(req, 2_000));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const updated = await actOnReport(id, parsed.data.action, parsed.data.clientId);
    return NextResponse.json({ report: toPublic(updated, parsed.data.clientId) });
  });
}
