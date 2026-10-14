import { handle, noStore, NextResponse } from "../_handle";
import { clientIp, jsonError, rateLimit, readJson, zodMessage } from "@/lib/server/guards";
import { createReport, listReports } from "@/lib/server/services";
import { CategorySchema, CreateReportSchema, StatusSchema } from "@/lib/types";
import { toPublic } from "./public";

export const dynamic = "force-dynamic";

/** GET /api/barriers?status=pending,confirmed&category=stairs&viewer=<clientId> — list map barriers. */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status");
    const status = statusParam ? statusParam.split(",").map((s) => StatusSchema.parse(s)) : undefined;
    const catParam = url.searchParams.get("category");
    const category = catParam ? CategorySchema.parse(catParam) : undefined;
    const viewer = url.searchParams.get("viewer") ?? undefined;
    const reports = await listReports(status, category);
    return NextResponse.json({ reports: reports.map((r) => toPublic(r, viewer)) }, noStore);
  });
}

/** POST /api/barriers — create a new report (always starts as "pending"). */
export async function POST(req: Request) {
  return handle(async () => {
    if (!rateLimit(`create:${clientIp(req)}`)) return jsonError(429, "Too many reports from this connection. Please wait a minute.");
    const body = await readJson(req, 8_000_000);
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) return jsonError(400, zodMessage(parsed.error));
    const report = await createReport(parsed.data);
    return NextResponse.json({ report: toPublic(report) }, { status: 201 });
  });
}
