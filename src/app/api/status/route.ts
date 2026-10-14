import { NextResponse } from "next/server";
import { systemStatus } from "@/lib/server/services";

export const dynamic = "force-dynamic";

/** GET /api/status — which integrations are live vs demo. Never returns secrets. */
export async function GET() {
  return NextResponse.json(systemStatus(), { headers: { "Cache-Control": "no-store" } });
}
