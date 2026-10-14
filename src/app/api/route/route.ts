import { handle, NextResponse } from "../_handle";
import { jsonError, readJson, zodMessage } from "@/lib/server/guards";
import { route } from "@/lib/server/services";
import { RouteRequestSchema } from "@/lib/types";

export const dynamic = "force-dynamic";

/** POST /api/route  { from, to, profile } */
export async function POST(req: Request) {
  return handle(async () => {
    const parsed = RouteRequestSchema.safeParse(await readJson(req, 2_000));
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const result = await route(parsed.data.from, parsed.data.to, parsed.data.profile);
    return NextResponse.json(result);
  });
}
