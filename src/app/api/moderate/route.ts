import { NextResponse } from "next/server";
import { isModerator, jsonError, moderatorTokenConfigured } from "@/lib/server/guards";

export const dynamic = "force-dynamic";

/** GET /api/moderate — check a moderator token (used by the console login). */
export async function GET(req: Request) {
  if (!moderatorTokenConfigured()) return jsonError(503, "Moderation is disabled: set MODERATOR_TOKEN on the server.");
  if (!isModerator(req)) return jsonError(401, "Incorrect moderator PIN.");
  return NextResponse.json({ ok: true });
}
