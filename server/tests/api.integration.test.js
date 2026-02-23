import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../src/api/createApp.js";
import { MindMapService } from "../src/services/mindmapService.js";
import { InMemoryGraphStore } from "../src/store/inMemoryGraphStore.js";

function buildApp() {
  const service = new MindMapService(new InMemoryGraphStore());
  return createApp(service);
}

describe("mindmap api integration", () => {
  it("supports bootstrap + connections flow", async () => {
    const app = buildApp();
    const boot = await request(app).post("/api/mcp/session/bootstrap").send({
      conversation_key: "c-api",
      turn_key: "t1",
      message: "PurposePath and RouteForge need shared attribution framework",
      tags: ["startup", "routeforge"],
      related_node_ids: ["purposepath", "routeforge"],
    });
    expect(boot.status).toBe(200);
    expect(boot.body.captured_items).toBeGreaterThan(0);

    const links = await request(app).get("/api/graph/connections").query({ nodeId: "purposepath" });
    expect(links.status).toBe(200);
    expect(Array.isArray(links.body.matches)).toBe(true);

    const setProfile = await request(app).post("/api/mcp/set-context-profile").send({
      profile_id: "business_custom",
      label: "Business Custom",
      mode: "custom",
      tags: ["startup", "routeforge"],
      node_ids: ["purposepath", "routeforge"],
      event_ids: [],
      include_full_context: false,
      conversation_key: "c-api",
    });
    expect(setProfile.status).toBe(200);
    expect(setProfile.body.profile_applied).toBe("business_custom");

    const getProfile = await request(app)
      .get("/api/mcp/get-context-profile")
      .query({ conversation_key: "c-api" });
    expect(getProfile.status).toBe(200);
    expect(getProfile.body.profile_applied).toBe("business_custom");

    const listProfiles = await request(app).get("/api/mcp/list-context-profiles");
    expect(listProfiles.status).toBe(200);
    expect(Array.isArray(listProfiles.body.profiles)).toBe(true);

    const searchDatapoints = await request(app)
      .get("/api/graph/search-datapoints")
      .query({ query: "routeforge", limit: 5, type: "all" });
    expect(searchDatapoints.status).toBe(200);
    expect(Array.isArray(searchDatapoints.body.matches)).toBe(true);
    expect(searchDatapoints.body.matches.some((m) => m.kind === "node" || m.kind === "evidence")).toBe(true);

    const recall = await request(app).post("/api/mcp/recall-context").send({
      query: "purposepath routeforge",
      conversation_key: "c-api",
      profile_id: "business_custom",
      use_profile_filtering: true,
      top_k: 5,
      include_contradictions: true,
      include_actions: true,
    });
    expect(recall.status).toBe(200);
    expect(Array.isArray(recall.body.matches)).toBe(true);
    expect(recall.body.meta.profile_applied).toBe("business_custom");
  });
});
