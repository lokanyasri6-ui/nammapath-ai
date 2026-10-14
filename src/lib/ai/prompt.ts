import { CATEGORY_IDS, SEVERITIES } from "../types";

export const CLASSIFY_PROMPT = `You are assisting a community accessibility-mapping project for pedestrians (wheelchair users, people with walking aids, older people, people with low vision).

Look ONLY at the visible physical environment in the photo and classify the single most significant pedestrian accessibility barrier.

Categories (use the id exactly):
- broken_footpath: broken, cracked, missing or very uneven footpath/pavement surface
- blocked_ramp: a kerb ramp or ramp that is blocked (vehicles, objects) or unusable
- stairs: stairs/steps with no visible step-free alternative
- construction_debris: construction material, digging, debris or objects obstructing the footpath
- waterlogging: standing water / flooding on the walking surface
- other: a different accessibility barrier (explain it)
- no_barrier_visible: no pedestrian barrier can be seen

Severity (use the id exactly): low, medium, high, impassable — judged for a wheelchair user.

Rules:
- Describe only visible evidence. Do not guess what is outside the frame.
- Do NOT identify, describe or speculate about any person, face, vehicle number plate, or anyone's health or disability.
- Never state that a route or path is safe or accessible overall; a single photo cannot establish that.
- If the image is blurry, dark, ambiguous or not a street scene, lower the confidence and set needsHumanReview to true.
- confidence is your probability (0 to 1) that the category is correct.
- Keep explanation under 40 words and uncertainty under 30 words.

Return JSON only.`;

/** Gemini `responseSchema` (OpenAPI subset). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    category: { type: "STRING", enum: [...CATEGORY_IDS, "no_barrier_visible"] },
    severity: { type: "STRING", enum: [...SEVERITIES] },
    confidence: { type: "NUMBER" },
    explanation: { type: "STRING" },
    uncertainty: { type: "STRING" },
    needsHumanReview: { type: "BOOLEAN" },
  },
  required: ["category", "severity", "confidence", "explanation", "uncertainty", "needsHumanReview"],
};
