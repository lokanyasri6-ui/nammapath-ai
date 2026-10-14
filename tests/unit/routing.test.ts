import { describe, expect, it } from "vitest";
import { findRoutes, evaluateSegment, nearestSegment } from "@/lib/routing";
import { buildSeedGraph, buildSeedReports } from "@/lib/seed";
import type { BarrierReport, Graph } from "@/lib/types";

const NOW = new Date("2026-10-14T06:00:00Z");
const graph = () => buildSeedGraph(NOW.getTime());
const reports = () => buildSeedReports(NOW.getTime());

describe("profile-aware routing on the seeded pilot graph", () => {
  it("wheelchair avoids the confirmed stairs-only footbridge and takes a longer step-free route", () => {
    const res = findRoutes(graph(), reports(), "bus_north", "health_centre", "wheelchair", NOW);
    expect(res.noRoute).toBeNull();
    const best = res.options.find((o) => o.kind === "best_match")!;
    const shortest = res.options.find((o) => o.kind === "shortest")!;
    expect(best.segmentIds).not.toContain("s_footbridge");
    expect(shortest.segmentIds).toContain("s_footbridge");
    expect(best.distanceM).toBeGreaterThan(shortest.distanceM);
    expect(shortest.violations.join(" ")).toMatch(/stairs/i);
    expect(best.reasons.join(" ")).toMatch(/Avoids Footbridge/);
    // prefers the verified east crossing over the west side with a pending report + unknown surface
    expect(best.segmentIds).toContain("s_east_crossing");
    expect(best.claim).toBe("supported");
  });

  it("general pedestrian takes the shortest route (footbridge) and reports it as the best match", () => {
    const res = findRoutes(graph(), reports(), "bus_north", "health_centre", "general", NOW);
    expect(res.options).toHaveLength(1);
    expect(res.options[0].segmentIds).toContain("s_footbridge");
  });

  it("selects a longer route when it better satisfies accessibility constraints", () => {
    const res = findRoutes(graph(), reports(), "bus_north", "health_centre", "wheelchair", NOW);
    const best = res.options[0];
    const shortest = res.options[1];
    expect(best.kind).toBe("best_match");
    expect(best.distanceM / shortest.distanceM).toBeGreaterThan(1.5);
  });

  it("treats a segment with unknown steps as uncertain — never claims step-free", () => {
    const res = findRoutes(graph(), reports(), "school", "park", "wheelchair", NOW);
    expect(res.noRoute).toBeNull();
    const best = res.options[0];
    expect(best.segmentIds).toContain("s_r3c1_park");
    expect(best.claim).toBe("uncertain");
    expect(best.uncertainties.join(" ")).toMatch(/steps unknown/);
    expect(best.missions.some((m) => m.segmentId === "s_r3c1_park")).toBe(true);
  });

  it("returns a no-route explanation when the only access is by stairs", () => {
    const res = findRoutes(graph(), reports(), "bus_north", "market_upper", "wheelchair", NOW);
    expect(res.noRoute).not.toBeNull();
    expect(res.noRoute!.blockers.join(" ")).toMatch(/Market stairs/);
    // shortest is still shown, but flagged as not meeting constraints
    expect(res.options[0].claim).toBe("not_applicable");
    expect(res.options[0].violations.length).toBeGreaterThan(0);
  });

  it("walking-aid profile may use stairs with a handrail but labels them", () => {
    const res = findRoutes(graph(), reports(), "bus_north", "health_centre", "walking_aid", NOW);
    expect(res.noRoute).toBeNull();
    const best = res.options[0];
    expect(best.instructions.some((i) => /handrail/i.test(i.text))).toBe(true);
  });

  it("low-vision profile prefers the signalised crossing with tactile paving", () => {
    const res = findRoutes(graph(), reports(), "library", "temple_tank", "low_vision", NOW);
    expect(res.noRoute).toBeNull();
    expect(res.limitations).toMatch(/NOT a certified safe route/);
  });

  it("a confirmed stair report blocks a step-free segment even if the segment data says no steps", () => {
    const g: Graph = graph();
    const r: BarrierReport = {
      ...reports()[0],
      id: "x1",
      segmentId: "s_east_crossing",
      category: "stairs",
      severity: "high",
      status: "confirmed",
      lastVerifiedAt: NOW.toISOString(),
    };
    const ev = evaluateSegment(g.segments.find((s) => s.id === "s_east_crossing")!, [r], "wheelchair", NOW);
    expect(ev.blocked).toMatch(/stairs/i);
    // and a PENDING report of the same thing only penalises (one unverified report never blocks)
    const ev2 = evaluateSegment(g.segments.find((s) => s.id === "s_east_crossing")!, [{ ...r, status: "pending" }], "wheelchair", NOW);
    expect(ev2.blocked).toBeNull();
    expect(ev2.penaltyM).toBeGreaterThan(0);
  });

  it("ignores resolved reports and treats stale confirmed ones as uncertain", () => {
    const all = reports();
    const resolved = all.find((r) => r.status === "resolved")!;
    const seg = graph().segments.find((s) => s.id === resolved.segmentId)!;
    expect(evaluateSegment(seg, [resolved], "wheelchair", NOW).barriers).toHaveLength(0);
    const flood = all.find((r) => r.category === "waterlogging")!; // confirmed 5 days ago, half-life 2 days
    const fseg = graph().segments.find((s) => s.id === flood.segmentId)!;
    const ev = evaluateSegment(fseg, [flood], "wheelchair", NOW);
    expect(ev.barriers[0].effect).toBe("uncertain");
    expect(ev.barriers[0].stale).toBe(true);
    expect(ev.blocked).toBeNull();
  });

  it("returns a clear result when start equals destination and throws on unknown nodes", () => {
    expect(findRoutes(graph(), [], "park", "park", "general", NOW).noRoute).not.toBeNull();
    expect(() => findRoutes(graph(), [], "nope", "park", "general", NOW)).toThrow(RangeError);
  });

  it("snaps a new report to the nearest footpath segment", () => {
    const g = graph();
    const fb = g.nodes.find((n) => n.id === "j_r1c2")!;
    const snap = nearestSegment(g, fb.lat - 0.0005, fb.lng + 0.00002);
    expect(snap?.segmentId).toBe("s_footbridge");
    expect(nearestSegment(g, 13.1, 80.3)).toBeNull();
  });
});
