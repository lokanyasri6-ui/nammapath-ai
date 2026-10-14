import { afterEach, describe, expect, it } from "vitest";
import { applyCommunityAction, applyModeratorStatus, freshness, ReportRuleError, routingEffect, tallies } from "@/lib/reports";
import { MemoryStore } from "@/lib/store/memory";
import { setStoreForTests } from "@/lib/store";
import { actOnReport, createReport, dashboard, moderate, route } from "@/lib/server/services";
import type { BarrierReport } from "@/lib/types";

const T0 = new Date("2026-10-14T06:00:00Z");
const later = (min: number) => new Date(T0.getTime() + min * 60_000);

function fresh(): BarrierReport {
  return {
    id: "r1", lat: 13.03, lng: 80.27, segmentId: "s_east_crossing", category: "construction_debris", severity: "medium",
    description: "", status: "pending", origin: "community", ai: null, userCorrectedAi: false, hasPhoto: false,
    reporterId: "reporter-0001", votes: [],
    history: [{ at: T0.toISOString(), from: null, to: "pending", by: "system", note: "created" }],
    createdAt: T0.toISOString(), updatedAt: T0.toISOString(), lastVerifiedAt: T0.toISOString(), language: "en",
  };
}

afterEach(() => setStoreForTests(undefined));

describe("report status transitions", () => {
  it("needs two independent confirmations; the reporter's own does not count", () => {
    let r = fresh();
    expect(() => applyCommunityAction(r, "confirm", "reporter-0001", later(1))).toThrow(ReportRuleError);
    r = applyCommunityAction(r, "confirm", "voter-aaaa-01", later(1));
    expect(r.status).toBe("pending");
    expect(tallies(r).confirms).toBe(1);
    r = applyCommunityAction(r, "confirm", "voter-bbbb-02", later(2));
    expect(r.status).toBe("confirmed");
    expect(r.history.at(-1)).toMatchObject({ from: "pending", to: "confirmed", by: "community" });
  });

  it("blocks duplicate votes from the same device", () => {
    const r = applyCommunityAction(fresh(), "dispute", "voter-aaaa-01", later(1));
    expect(() => applyCommunityAction(r, "dispute", "voter-aaaa-01", later(2))).toThrow(/already/);
  });

  it("becomes disputed when disputes reach the threshold and outnumber confirmations", () => {
    let r = applyCommunityAction(fresh(), "confirm", "v-aaaaaaa1", later(1));
    r = applyCommunityAction(r, "dispute", "v-bbbbbbb2", later(2));
    expect(r.status).toBe("pending");
    r = applyCommunityAction(r, "dispute", "v-ccccccc3", later(3));
    expect(r.status).toBe("disputed");
  });

  it("resolves after two 'fixed' votes and re-opens on a new 'still there'", () => {
    let r = applyCommunityAction(fresh(), "resolve", "v-aaaaaaa1", later(1));
    r = applyCommunityAction(r, "resolve", "v-bbbbbbb2", later(2));
    expect(r.status).toBe("resolved");
    expect(routingEffect(r, later(3))).toBe("ignore");
    r = applyCommunityAction(r, "confirm", "v-ccccccc3", later(4));
    expect(r.status).toBe("pending");
  });

  it("moderator can set any status and it is logged", () => {
    const r = applyModeratorStatus(fresh(), "confirmed", "Site visit", later(5));
    expect(r.status).toBe("confirmed");
    expect(r.history.at(-1)).toMatchObject({ by: "moderator", note: "Site visit" });
    expect(() => applyModeratorStatus(r, "confirmed", "", later(6))).toThrow(ReportRuleError);
  });

  it("temporary barriers go stale after one half-life; structural ones don't", () => {
    const flood = { ...fresh(), category: "waterlogging" as const, status: "confirmed" as const };
    expect(freshness(flood, later(60 * 24 * 1)).stale).toBe(false);
    expect(freshness(flood, later(60 * 24 * 3)).stale).toBe(true);
    expect(routingEffect(flood, later(60 * 24 * 3))).toBe("uncertain");
    const stairs = { ...flood, category: "stairs" as const };
    expect(freshness(stairs, later(60 * 24 * 30)).stale).toBe(false);
    expect(routingEffect(stairs, later(60 * 24 * 30))).toBe("certain");
  });
});

describe("services: create → verify → reroute (in-memory store)", () => {
  it("creates reports as pending, snaps to a segment, and routing reacts once confirmed", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    const before = await route("bus_north", "health_centre", "wheelchair");
    expect(before.options[0].segmentIds).toContain("s_r3c2_r3c3");

    const created = await createReport({
      lat: 13.0318, lng: 80.2712, category: "waterlogging", severity: "impassable", description: "deep water",
      clientId: "reporter-abcdef01", language: "en", photo: null,
      ai: { category: "waterlogging", severity: "high", confidence: 0.95, explanation: "x", uncertainty: "", provider: "demo", isDemo: true },
    });
    expect(created.status).toBe("pending"); // even a confident AI prediction never auto-confirms
    expect(created.segmentId).toBe("s_r3c2_r3c3");
    expect(created.userCorrectedAi).toBe(true);

    const stillPending = await route("bus_north", "health_centre", "wheelchair");
    // one unverified report is a (heavy) penalty, never a hard block
    expect(stillPending.noRoute).toBeNull();
    expect(stillPending.options.flatMap((o) => o.violations).join(" ")).not.toMatch(/Waterlogging/);

    await actOnReport(created.id, "confirm", "voter-11111111");
    const confirmed = await actOnReport(created.id, "confirm", "voter-22222222");
    expect(confirmed.status).toBe("confirmed");

    const after = await route("bus_north", "health_centre", "wheelchair");
    expect(after.options[0].segmentIds).not.toContain("s_r3c2_r3c3");
    expect(after.options[0].claim).toBe("uncertain"); // the west detour has a pending report + unknown surface
    const shortestAfter = after.options.find((o) => o.kind === "shortest");
    expect(shortestAfter?.violations.join(" ")).toMatch(/stairs/i);

    await moderate(created.id, "resolved", "Water drained");
    const resolved = await route("bus_north", "health_centre", "wheelchair");
    expect(resolved.options[0].segmentIds).toContain("s_r3c2_r3c3");
  });

  it("verification changes routing: a pending HIGH flood is flagged, a confirmed one re-routes", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    const r = await createReport({
      lat: 13.0318, lng: 80.2712, category: "waterlogging", severity: "high", description: "",
      clientId: "reporter-abcdef01", language: "en", photo: null, ai: null,
    });
    const pending = (await route("bus_north", "health_centre", "wheelchair")).options[0];
    expect(pending.segmentIds).toContain("s_r3c2_r3c3");
    expect(pending.claim).toBe("uncertain");
    expect(pending.barriers.some((b) => b.reportId === r.id && b.effect === "uncertain")).toBe(true);

    await actOnReport(r.id, "confirm", "voter-11111111");
    await actOnReport(r.id, "confirm", "voter-22222222");
    const confirmed = (await route("bus_north", "health_centre", "wheelchair")).options[0];
    expect(confirmed.segmentIds).not.toContain("s_r3c2_r3c3");
  });

  it("rejects an invalid photo when creating a report", async () => {
    setStoreForTests(new MemoryStore(Date.now()));
    await expect(
      createReport({ lat: 13.03, lng: 80.27, category: "other", severity: "low", description: "", clientId: "reporter-abcdef01", language: "en", ai: null, photo: "data:image/jpeg;base64,PGh0bWw+" }),
    ).rejects.toThrow(/JPEG, PNG or WebP/);
  });

  it("dashboard on an empty database returns zeros, not errors", async () => {
    setStoreForTests(new MemoryStore(Date.now(), { empty: true }));
    const { stats } = await dashboard();
    expect(stats.totals.all).toBe(0);
    expect(stats.byCategory).toEqual([]);
    expect(stats.hotspots).toEqual([]);
    expect(stats.aiStats.avgConfidence).toBeNull();
    expect(stats.trend).toHaveLength(8);
  });
});
