import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryStore } from "@/lib/store/memory";
import { setStoreForTests, StoreUnavailableError, type Store } from "@/lib/store";
import { GET as listBarriers, POST as createBarrier } from "@/app/api/barriers/route";
import { POST as routePost } from "@/app/api/route/route";
import { GET as dashboardGet } from "@/app/api/dashboard/route";
import { POST as classifyPost } from "@/app/api/classify/route";
import { POST as moderatePost } from "@/app/api/moderate/[id]/route";

const failing: Store = {
  mode: "supabase",
  getGraph: async () => { throw new StoreUnavailableError("The report database is temporarily unavailable."); },
  listReports: async () => { throw new StoreUnavailableError("The report database is temporarily unavailable."); },
  getReport: async () => { throw new StoreUnavailableError("x"); },
  insertReport: async () => { throw new StoreUnavailableError("x"); },
  updateReport: async () => { throw new StoreUnavailableError("x"); },
  getPhotoUrl: async () => null,
};

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

beforeEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.MODERATOR_TOKEN;
});
afterEach(() => setStoreForTests(undefined));

describe("API failure and empty states", () => {
  it("returns 503 with a safe message when the database is down", async () => {
    setStoreForTests(failing);
    const res = await listBarriers(new Request("http://x/api/barriers"));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/temporarily unavailable/);
    expect(JSON.stringify(body)).not.toMatch(/at .*\.ts/); // no stack traces
    expect((await dashboardGet()).status).toBe(503);
  });

  it("returns an empty list (200) for an empty database", async () => {
    setStoreForTests(new MemoryStore(Date.now(), { empty: true }));
    const res = await listBarriers(new Request("http://x/api/barriers"));
    expect(res.status).toBe(200);
    expect((await res.json()).reports).toEqual([]);
  });

  it("validates inputs with 400s", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    expect((await routePost(json("http://x/api/route", { from: "a" }))).status).toBe(400);
    expect((await routePost(json("http://x/api/route", { from: "nope", to: "park", profile: "general" }))).status).toBe(400);
    expect((await createBarrier(json("http://x/api/barriers", { lat: 999, lng: 1, category: "x" }))).status).toBe(400);
    expect((await listBarriers(new Request("http://x/api/barriers?status=bogus"))).status).toBe(400);
  });

  it("never exposes reporter or voter device ids", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    const body = await (await listBarriers(new Request("http://x/api/barriers"))).json();
    expect(body.reports.length).toBeGreaterThan(0);
    for (const r of body.reports) {
      expect(r).not.toHaveProperty("reporterId");
      expect(r).not.toHaveProperty("votes");
    }
  });

  it("classify rejects a non-image upload with 415 and works in demo mode", async () => {
    const bad = new FormData();
    bad.append("photo", new File([new TextEncoder().encode("hello")], "x.jpg", { type: "image/jpeg" }));
    const r1 = await classifyPost(new Request("http://x/api/classify", { method: "POST", body: bad }));
    expect(r1.status).toBe(415);

    const good = new FormData();
    good.append("photo", new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])], "steps.jpg", { type: "image/jpeg" }));
    const r2 = await classifyPost(new Request("http://x/api/classify", { method: "POST", body: good }));
    expect(r2.status).toBe(200);
    const body = await r2.json();
    expect(body.isDemo).toBe(true);
    expect(body.prediction.category).toBe("stairs");
  });

  it("moderation requires the moderator token", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    const ctx = { params: Promise.resolve({ id: "demo-r2" }) };
    expect((await moderatePost(json("http://x/api/moderate/demo-r2", { status: "confirmed" }), ctx)).status).toBe(401);
    const ok = await moderatePost(json("http://x/api/moderate/demo-r2", { status: "confirmed", note: "checked" }, { "x-moderator-token": "demo-moderator" }), ctx);
    expect(ok.status).toBe(200);
    expect((await ok.json()).report.status).toBe("confirmed");
  });
});
