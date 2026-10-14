import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AiResponseError } from "@/lib/ai";
import { ReportRuleError } from "@/lib/reports";
import { BadJson, jsonError, PayloadTooLarge, zodMessage } from "@/lib/server/guards";
import { ForbiddenError, NotFoundError } from "@/lib/server/services";
import { StoreUnavailableError } from "@/lib/store";
import { UploadError } from "@/lib/upload";

/** Map known errors to safe HTTP responses; never leak stack traces. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof UploadError) return jsonError(e.status, e.message);
    if (e instanceof ZodError) return jsonError(400, zodMessage(e));
    if (e instanceof PayloadTooLarge) return jsonError(413, "Request is too large.");
    if (e instanceof BadJson) return jsonError(400, "Request body must be valid JSON.");
    if (e instanceof NotFoundError) return jsonError(404, e.message);
    if (e instanceof ForbiddenError) return jsonError(403, e.message);
    if (e instanceof ReportRuleError) return jsonError(409, e.message, { code: e.code });
    if (e instanceof RangeError) return jsonError(400, e.message);
    if (e instanceof StoreUnavailableError) return jsonError(503, e.message);
    if (e instanceof AiResponseError) return jsonError(502, "The AI service returned an unusable answer. Please classify the barrier manually.", { fallback: "manual" });
    console.error("[api] unexpected error", e);
    return jsonError(500, "Something went wrong on our side. Please try again.");
  }
}

export const noStore = { headers: { "Cache-Control": "no-store" } };
export { NextResponse };
