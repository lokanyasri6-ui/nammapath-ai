/**
 * Vision-provider abstraction.
 *  - GeminiProvider : real inference (server-side only, needs GEMINI_API_KEY)
 *  - DemoProvider   : deterministic, clearly-labelled fake predictions
 *
 * Every provider's raw output goes through `applyAiPolicy`, which validates
 * it with Zod and enforces the human-review rules.
 */
import { AiPredictionSchema, type AiPrediction, type AiResult } from "../types";
import type { ValidatedImage } from "../upload";
import { DemoProvider } from "./demo";
import { AiResponseError } from "./errors";
import { GeminiProvider } from "./gemini";

export { AiResponseError };

export interface VisionProvider {
  readonly name: "gemini" | "demo";
  readonly model: string;
  classify(image: ValidatedImage, hint?: { fileName?: string; description?: string }): Promise<unknown>;
}

/** Below this, the UI must ask for human review and must not pre-select a definitive answer. */
export const LOW_CONFIDENCE = 0.6;


/**
 * Validate a provider's raw response and apply safety policy.
 * Throws AiResponseError if the response is not usable at all.
 */
export function applyAiPolicy(raw: unknown, provider: VisionProvider["name"], model: string): AiResult {
  const parsed = AiPredictionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiResponseError("The AI response did not match the expected format.");
  }
  const prediction: AiPrediction = { ...parsed.data };
  const policyNotes: string[] = [];

  if (prediction.confidence < LOW_CONFIDENCE && !prediction.needsHumanReview) {
    prediction.needsHumanReview = true;
    policyNotes.push(`Confidence ${Math.round(prediction.confidence * 100)}% is below ${LOW_CONFIDENCE * 100}% — human review required.`);
  }
  if (prediction.category === "no_barrier_visible") {
    prediction.needsHumanReview = true;
    policyNotes.push("No barrier was recognised. Please choose the category yourself if there is one.");
  }
  if (prediction.category === "other") {
    prediction.needsHumanReview = true;
    policyNotes.push("'Other' needs a human description.");
  }
  // Defensive: strip anything that looks like a claim of overall route safety.
  if (/\b(route|path) is (completely |fully )?(safe|accessible)\b/i.test(prediction.explanation)) {
    prediction.explanation = prediction.explanation.replace(/\b(the )?(route|path) is (completely |fully )?(safe|accessible)\b/gi, "[removed: a photo cannot establish route safety]");
    policyNotes.push("Removed a claim about overall route safety — a single photo cannot establish that.");
  }
  return { prediction, provider, model, isDemo: provider === "demo", policyNotes };
}

export function getVisionProvider(): VisionProvider {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (key) return new GeminiProvider(key, process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash");
  return new DemoProvider();
}

export async function classifyImage(image: ValidatedImage, hint?: { fileName?: string; description?: string }): Promise<AiResult> {
  const provider = getVisionProvider();
  const raw = await provider.classify(image, hint);
  return applyAiPolicy(raw, provider.name, provider.model);
}
