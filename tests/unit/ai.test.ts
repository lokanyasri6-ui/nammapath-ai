import { describe, expect, it } from "vitest";
import { applyAiPolicy, AiResponseError, LOW_CONFIDENCE } from "@/lib/ai";
import { DemoProvider } from "@/lib/ai/demo";
import { validateImageBytes } from "@/lib/upload";

const ok = {
  category: "stairs",
  severity: "impassable",
  confidence: 0.9,
  explanation: "A flight of about 20 steps with no ramp visible.",
  uncertainty: "",
  needsHumanReview: false,
};

describe("AI response validation and policy", () => {
  it("accepts a well-formed response unchanged", () => {
    const r = applyAiPolicy(ok, "gemini", "gemini-2.5-flash");
    expect(r.prediction.category).toBe("stairs");
    expect(r.prediction.needsHumanReview).toBe(false);
    expect(r.isDemo).toBe(false);
  });

  it("forces human review when confidence is below the threshold", () => {
    const r = applyAiPolicy({ ...ok, confidence: LOW_CONFIDENCE - 0.01 }, "gemini", "m");
    expect(r.prediction.needsHumanReview).toBe(true);
    expect(r.policyNotes.join(" ")).toMatch(/human review/);
  });

  it("forces human review for 'no barrier visible' and 'other'", () => {
    expect(applyAiPolicy({ ...ok, category: "no_barrier_visible" }, "gemini", "m").prediction.needsHumanReview).toBe(true);
    expect(applyAiPolicy({ ...ok, category: "other" }, "gemini", "m").prediction.needsHumanReview).toBe(true);
  });

  it("rejects malformed responses", () => {
    expect(() => applyAiPolicy({ ...ok, confidence: 1.7 }, "gemini", "m")).toThrow(AiResponseError);
    expect(() => applyAiPolicy({ ...ok, category: "pothole_zone" }, "gemini", "m")).toThrow(AiResponseError);
    expect(() => applyAiPolicy("not json", "gemini", "m")).toThrow(AiResponseError);
    expect(() => applyAiPolicy({ ...ok, explanation: "" }, "gemini", "m")).toThrow(AiResponseError);
  });

  it("strips claims that a whole route is safe", () => {
    const r = applyAiPolicy({ ...ok, explanation: "Ramp visible, the route is fully accessible." }, "gemini", "m");
    expect(r.prediction.explanation).not.toMatch(/route is fully accessible/);
    expect(r.policyNotes.length).toBeGreaterThan(0);
  });

  it("demo provider is deterministic and labelled as demo", async () => {
    const img = validateImageBytes(new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3, 4, 5, 6, 7, 8]));
    const p = new DemoProvider();
    const a = await p.classify(img, { fileName: "IMG_1.jpg" });
    const b = await p.classify(img, { fileName: "IMG_1.jpg" });
    expect(a).toEqual(b);
    const r = applyAiPolicy(a, "demo", p.model);
    expect(r.isDemo).toBe(true);
    expect(r.prediction.explanation).toMatch(/DEMO MODE/);
    const hinted = applyAiPolicy(await p.classify(img, { fileName: "flooded-road.jpg" }), "demo", p.model);
    expect(hinted.prediction.category).toBe("waterlogging");
  });
});
