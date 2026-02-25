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

  it("supports import endpoints and source-aware retrieval", async () => {
    const app = buildApp();
    app.locals.autoSync = {
      getStatus: () => ({ enabled: true, running: false }),
      runOnce: async () => ({
        enabled: true,
        running: false,
        last_trigger: "api",
        last_result: "success",
        last_error: "",
      }),
    };
    const cursorImport = await request(app).post("/api/import/cursor-chats").send({
      conversation_key: "import-cursor-api",
      workspace: "/Users/me/mindmap-demo",
      chats: [
        {
          chat_id: "cursor-1",
          turn_index: 1,
          title: "Import wiring",
          message: "Auto import cursor context and show source in UI",
          tags: ["import", "ui"],
          related_node_ids: ["engineering"],
        },
      ],
    });
    expect(cursorImport.status).toBe(200);
    expect(cursorImport.body.imported).toBe(1);

    const gitImport = await request(app).post("/api/import/git-history").send({
      conversation_key: "import-git-api",
      repository: "mindmap-demo",
      commits: [
        {
          hash: "def456",
          author: "Dev User",
          date: new Date().toISOString(),
          subject: "feat: add source filter support",
          files: ["src/MindMapExplorer.jsx"],
        },
      ],
    });
    expect(gitImport.status).toBe(200);
    expect(gitImport.body.imported).toBe(1);

    const sourceFilteredSearch = await request(app)
      .get("/api/graph/search-datapoints")
      .query({ query: "source filter", limit: 5, type: "evidence", sources: "git_commit" });
    expect(sourceFilteredSearch.status).toBe(200);
    expect(Array.isArray(sourceFilteredSearch.body.matches)).toBe(true);
    expect(sourceFilteredSearch.body.matches.length).toBeGreaterThan(0);

    const status = await request(app).get("/api/import/status");
    expect(status.status).toBe(200);
    expect(status.body.evidence).toBeGreaterThan(0);
    expect(status.body.source_counts.git_commit).toBeGreaterThan(0);
    expect(status.body.auto_sync.enabled).toBe(true);

    const runAutoSync = await request(app).post("/api/import/auto-sync/run");
    expect(runAutoSync.status).toBe(200);
    expect(runAutoSync.body.ok).toBe(true);
    expect(runAutoSync.body.status.last_trigger).toBe("api");
  });

  it("returns error semantics for failed auto-sync run", async () => {
    const app = buildApp();
    app.locals.autoSync = {
      getStatus: () => ({ enabled: true, running: false }),
      runOnce: async () => ({
        enabled: true,
        running: false,
        last_result: "failed",
        last_error: "git unavailable (/bad/path)",
      }),
    };
    const runAutoSync = await request(app).post("/api/import/auto-sync/run");
    expect(runAutoSync.status).toBe(503);
    expect(runAutoSync.body.ok).toBe(false);
    expect(runAutoSync.body.error).toContain("git unavailable");
  });

  it("supports batch collection and structured export endpoints", async () => {
    const app = buildApp();
    const batch = await request(app).post("/api/collection/batch").send({
      conversation_key: "api-batch-c1",
      batch_id: "api-batch-1",
      entries: [
        {
          turn_key: "turn-1",
          message: "Release checklist depends on observability hardening",
          source: "mcp_initial",
          tags: ["release", "observability"],
          related_node_ids: ["release-checklist", "observability"],
          context: { owner: "platform", priority: "high" },
        },
        {
          turn_key: "turn-2",
          message: "Capture rollback protocol and runbook ownership",
          source: "mcp_explicit",
          tags: ["release", "runbook"],
          related_node_ids: ["rollback-protocol"],
        },
      ],
      links: [
        {
          from_id: "release-checklist",
          to_id: "rollback-protocol",
          type: "depends_on",
          weight: 0.9,
        },
      ],
    });
    expect(batch.status).toBe(200);
    expect(batch.body.totals.entries_received).toBe(2);
    expect(batch.body.totals.links_applied).toBe(1);

    const exported = await request(app).post("/api/collection/export").send({
      conversation_key: "api-batch-c1",
      include_nodes: true,
      include_edges: true,
      include_evidence: true,
      include_profiles: true,
      sources: ["mcp_initial", "mcp_explicit"],
      limit_evidence: 100,
    });
    expect(exported.status).toBe(200);
    expect(exported.body.meta.conversation_key).toBe("api-batch-c1");
    expect(exported.body.meta.counts.evidence).toBeGreaterThan(0);
    expect(Array.isArray(exported.body.nodes)).toBe(true);
    expect(Array.isArray(exported.body.edges)).toBe(true);
    expect(Array.isArray(exported.body.evidence)).toBe(true);
  });
});
