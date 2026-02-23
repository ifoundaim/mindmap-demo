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
  });
});
