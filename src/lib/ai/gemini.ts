import type { ValidatedImage } from "../upload";
import type { VisionProvider } from "./index";
import { AiResponseError } from "./errors";
import { CLASSIFY_PROMPT, GEMINI_RESPONSE_SCHEMA } from "./prompt";

/** Gemini via the public REST API — no SDK dependency, key stays on the server. */
export class GeminiProvider implements VisionProvider {
  readonly name = "gemini" as const;
  constructor(private readonly apiKey: string, readonly model: string) {}

  async classify(image: ValidatedImage, hint?: { description?: string }): Promise<unknown> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;
    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: CLASSIFY_PROMPT + (hint?.description ? `\n\nReporter's note (may be wrong): ${hint.description.slice(0, 300)}` : "") },
            { inline_data: { mime_type: image.mime, data: Buffer.from(image.bytes).toString("base64") } },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Gemini request failed with status ${res.status}`);
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      try {
        return JSON.parse(text);
      } catch {
        throw new AiResponseError("The AI response was not valid JSON.");
      }
    } finally {
      clearTimeout(timer);
    }
  }
}
