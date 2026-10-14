import { handle, NextResponse } from "../_handle";
import { AiResponseError, classifyImage } from "@/lib/ai";
import { clientIp, jsonError, rateLimit } from "@/lib/server/guards";
import { MAX_UPLOAD_BYTES, validateImageBytes } from "@/lib/upload";

export const dynamic = "force-dynamic";

/**
 * POST /api/classify  (multipart/form-data: photo=<file>, description?=<text>)
 * Returns a validated, policy-checked prediction. The photo is NOT stored by this endpoint.
 */
export async function POST(req: Request) {
  return handle(async () => {
    if (!rateLimit(`ai:${clientIp(req)}`)) return jsonError(429, "Too many photo analyses. Please wait a minute, or classify manually.");
    const len = Number(req.headers.get("content-length") || 0);
    if (len > MAX_UPLOAD_BYTES + 100_000) return jsonError(413, "The photo is larger than 5 MB.");
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return jsonError(400, "Expected a multipart form with a 'photo' field.");
    }
    const file = form.get("photo");
    if (!(file instanceof File)) return jsonError(400, "Please attach a photo.");
    const image = validateImageBytes(new Uint8Array(await file.arrayBuffer()), file.type);
    const description = String(form.get("description") ?? "").slice(0, 300);
    try {
      const result = await classifyImage(image, { fileName: file.name, description });
      return NextResponse.json(result);
    } catch (e) {
      if (!(e instanceof AiResponseError)) {
        console.error("[classify] provider error", e instanceof Error ? e.message : e);
        return jsonError(503, "The AI service is unavailable right now. You can still classify the barrier manually.", { fallback: "manual" });
      }
      throw e;
    }
  });
}
