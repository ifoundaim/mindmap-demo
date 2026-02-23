import { describe, it, expect } from "vitest";
import { InMemoryGraphStore } from "../src/store/inMemoryGraphStore.js";
import { MindMapService } from "../src/services/mindmapService.js";

function createService() {
  return new MindMapService(new InMemoryGraphStore());
}

describe("mindmap service dedupe + merge behavior", () => {
  it("dedupes bootstrap calls idempotently", async () => {
    const service = createService();
    const payload = {
      conversation_key: "c1",
      turn_key: "t1",
      message: "PurposePath depends on narrative UX",
    };
    const a = await service.sessionBootstrap(payload);
    const b = await service.sessionBootstrap(payload);
    expect(a.captured_items).toBeGreaterThan(0);
    expect(b.skipped_duplicates).toBeGreaterThanOrEqual(1);
  });

  it("merges edge weights instead of duplicating edges", async () => {
    const service = createService();
    await service.linkNodes({
      from_id: "purposepath",
      to_id: "routeforge",
      type: "supports_goal",
      weight: 0.4,
    });
    await service.linkNodes({
      from_id: "purposepath",
      to_id: "routeforge",
      type: "supports_goal",
      weight: 0.9,
    });
    const matches = (await service.findConnections({ nodeId: "purposepath", limit: 5 })).matches;
    expect(matches).toHaveLength(1);
    expect(matches[0].weight).toBe(0.9);
  });

  it("returns contradictions and bridge stats in insights", async () => {
    const service = createService();
    await service.linkNodes({
      from_id: "routeforge",
      to_id: "purposepath",
      type: "conflicts_with",
      weight: 0.6,
    });
    await service.linkNodes({
      from_id: "purposepath",
      to_id: "vibecode-school",
      type: "supports_goal",
      weight: 0.8,
    });
    const insights = await service.getInsights();
    expect(insights.contradictions.length).toBe(1);
    expect(insights.top_bridges.length).toBeGreaterThan(0);
  });
});
