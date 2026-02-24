import express from "express";
import cors from "cors";

export function createApp(service) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "mindmap-api" });
  });

  app.post("/api/mcp/session/bootstrap", async (req, res) => {
    try {
      const result = await service.sessionBootstrap(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/mcp/log-insight", async (req, res) => {
    try {
      const result = await service.logInsight(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/mcp/link-nodes", async (req, res) => {
    try {
      const result = await service.linkNodes(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/mcp/recall-context", async (req, res) => {
    try {
      const result = await service.recallContext(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/mcp/set-context-profile", async (req, res) => {
    try {
      const result = await service.setContextProfile(req.body);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/mcp/get-context-profile", async (req, res) => {
    try {
      const result = await service.getContextProfile({
        profile_id: req.query.profile_id ? String(req.query.profile_id) : undefined,
        conversation_key: req.query.conversation_key ? String(req.query.conversation_key) : undefined,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/mcp/list-context-profiles", async (_req, res) => {
    try {
      const result = await service.listContextProfiles();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/import/cursor-chats", async (req, res) => {
    try {
      const result = await service.importCursorChats(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/import/git-history", async (req, res) => {
    try {
      const result = await service.importGitHistory(req.body || {});
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/import/status", async (req, res) => {
    try {
      const nodes = await service.store.listNodes();
      const evidence = Array.from(service.store.evidence?.values?.() || []);
      const bySource = evidence.reduce((acc, item) => {
        const source = item.source || "unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      res.json({
        nodes: nodes.length,
        evidence: evidence.length,
        source_counts: bySource,
        auto_sync: req?.app?.locals?.autoSync?.getStatus?.() || null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/import/auto-sync/run", async (_req, res) => {
    try {
      const autoSync = _req?.app?.locals?.autoSync;
      if (!autoSync) {
        res.status(400).json({ error: "Auto-sync is not configured." });
        return;
      }
      const status = await autoSync.runOnce("api");
      const ok = status?.last_result === "success" || status?.last_result === "partial";
      if (!ok) {
        res.status(503).json({
          ok: false,
          error: status?.last_error || "Auto-sync run failed.",
          status,
        });
        return;
      }
      res.json({ ok: true, status });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/graph/connections", async (req, res) => {
    const nodeId = String(req.query.nodeId || "");
    const limit = Number(req.query.limit || 8);
    const types = String(req.query.types || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!nodeId) {
      res.status(400).json({ error: "nodeId is required" });
      return;
    }
    try {
      const result = await service.findConnections({ nodeId, limit, types });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/graph/insights", async (_req, res) => {
    try {
      const result = await service.getInsights();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/graph/search-datapoints", async (req, res) => {
    const query = String(req.query.query || req.query.q || "");
    const limit = Number(req.query.limit || 20);
    const type = String(req.query.type || "all");
    const sources = String(req.query.sources || "")
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      const result = await service.searchDatapoints({ query, limit, type, sources });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/mcp/recommend-next-actions", async (req, res) => {
    const limit = Number(req.query.limit || 8);
    try {
      const actions = await service.recommendNextActions(limit);
      res.json({ actions });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return app;
}
