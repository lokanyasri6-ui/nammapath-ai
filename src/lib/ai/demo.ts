import { CATEGORIES, guessCategoryFromText } from "../categories";
import type { CategoryId, Severity } from "../types";
import type { ValidatedImage } from "../upload";
import type { VisionProvider } from "./index";

/**
 * DEMO PROVIDER — NOT REAL MODEL INFERENCE.
 *
 * Deterministic so that demos and tests are repeatable:
 *  1. If the file name or the reporter's note contains a category keyword
 *     (e.g. "stairs.jpg", "flooded road"), that category is used.
 *  2. Otherwise a category is derived from a hash of the image bytes.
 * Confidence is also derived from the hash, and roughly one image in four
 * gets a low confidence so the human-review path is visible in demos.
 */
export class DemoProvider implements VisionProvider {
  readonly name = "demo" as const;
  readonly model = "demo-deterministic-v1";

  async classify(image: ValidatedImage, hint?: { fileName?: string; description?: string }): Promise<unknown> {
    const h = fnv1a(image.bytes);
    const fromHint = guessCategoryFromText(`${hint?.fileName ?? ""} ${hint?.description ?? ""}`.replace(/[_.-]/g, " "));
    const order: CategoryId[] = ["broken_footpath", "construction_debris", "blocked_ramp", "waterlogging", "stairs"];
    const category: CategoryId = fromHint ?? order[h % order.length];
    const sevOrder: Severity[] = ["medium", "high", "low", "medium"];
    const severity: Severity = category === "stairs" ? "impassable" : sevOrder[(h >>> 3) % sevOrder.length];
    const lowConf = !fromHint && (h >>> 7) % 4 === 0;
    const confidence = lowConf ? 0.42 + ((h >>> 11) % 10) / 100 : 0.68 + ((h >>> 11) % 25) / 100;

    return {
      category,
      severity,
      confidence: Math.round(confidence * 100) / 100,
      explanation: `DEMO MODE: simulated result suggesting "${CATEGORIES[category].en}". No AI model looked at this photo.`,
      uncertainty: lowConf
        ? "Simulated low-confidence result to demonstrate the human-review step."
        : fromHint
          ? "Category taken from keywords in the file name or your note, not from the image."
          : "Simulated result derived from the file contents.",
      needsHumanReview: lowConf,
    };
  }
}

function fnv1a(bytes: Uint8Array): number {
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    h ^= bytes[i];
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
