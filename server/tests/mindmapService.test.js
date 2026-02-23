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

  it("recalls context with evidence and contradictions", async () => {
    const service = createService();
    await service.sessionBootstrap({
      conversation_key: "memory-c1",
      turn_key: "t1",
      message: "PurposePath needs RouteForge attribution rails for creator trust",
      tags: ["purposepath", "routeforge", "startup"],
      related_node_ids: ["purposepath", "routeforge"],
    });
    await service.linkNodes({
      from_id: "purposepath",
      to_id: "routeforge",
      type: "conflicts_with",
      weight: 0.5,
    });

    const recalled = await service.recallContext({
      query: "How is PurposePath connected to RouteForge?",
      conversation_key: "memory-c1",
      top_k: 5,
      include_contradictions: true,
      include_actions: true,
    });

    expect(Array.isArray(recalled.matches)).toBe(true);
    expect(recalled.matches.length).toBeGreaterThan(0);
    expect(Array.isArray(recalled.contradictions)).toBe(true);
    expect(recalled.meta.top_k).toBe(5);
    expect(recalled.meta.profile_applied).toBe("business_only");
  });

  it("supports setting and reading conversation profile mappings", async () => {
    const service = createService();
    await service.setContextProfile({
      profile_id: "music_custom",
      label: "Music Custom",
      mode: "custom",
      tags: ["music", "suno"],
      node_ids: ["suno-music"],
      event_ids: [],
      include_full_context: false,
      conversation_key: "conv-music",
    });

    const profile = await service.getContextProfile({ conversation_key: "conv-music" });
    expect(profile.profile_applied).toBe("music_custom");

    const listed = await service.listContextProfiles();
    expect(Array.isArray(listed.profiles)).toBe(true);
    expect(listed.profiles.find((p) => p.profile_id === "music_custom")).toBeTruthy();
  });

  it("searches datapoints by keyword for profile editor flows", async () => {
    const service = createService();
    await service.logInsight({
      conversation_key: "search-c1",
      turn_key: "t1",
      message: "RouteForge attribution rails improve creator payout trust",
      tags: ["routeforge", "startup"],
      related_node_ids: ["routeforge"],
    });

    const result = await service.searchDatapoints({ query: "routeforge", limit: 10 });
    expect(Array.isArray(result.matches)).toBe(true);
    expect(result.matches.length).toBeGreaterThan(0);
    expect(result.matches.some((m) => m.kind === "node" && m.node_id.includes("routeforge"))).toBe(true);
    expect(result.matches.some((m) => m.kind === "evidence")).toBe(true);
  });

  it("supports event-id based profile filtering in recall", async () => {
    const service = createService();
    const boot = await service.logInsight({
      conversation_key: "event-profile-c1",
      turn_key: "t1",
      message: "Composer notes for cinematic music motif",
      tags: ["music", "motif"],
      related_node_ids: ["suno-music"],
    });
    expect(boot.inserted).toBe(true);

    const eventId = boot.eventId;
    await service.setContextProfile({
      profile_id: "events_only_music",
      label: "Events only music",
      mode: "custom",
      tags: [],
      node_ids: [],
      event_ids: [eventId],
      include_full_context: false,
      conversation_key: "event-profile-c1",
    });

    const recalled = await service.recallContext({
      query: "cinematic motif",
      conversation_key: "event-profile-c1",
      profile_id: "events_only_music",
      use_profile_filtering: true,
      top_k: 5,
      include_contradictions: false,
      include_actions: false,
    });
    expect(recalled.meta.profile_applied).toBe("events_only_music");
    expect(recalled.matches.length).toBeGreaterThan(0);
  });
});
