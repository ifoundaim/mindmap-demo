import "dotenv/config";
import { randomUUID } from "node:crypto";
import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { createGraphStore } from "../store/createGraphStore.js";
import { MindMapService } from "../services/mindmapService.js";
import { createMcpServer } from "./createMcpServer.js";

const port = Number(process.env.MCP_HTTP_PORT || 8788);
const app = express();
app.use(express.json({ limit: "1mb" }));
const transports = {};

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "mindmap-mcp-http" });
});

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];

  try {
    let transport;

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
      await transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
          transports[initializedSessionId] = transport;
        },
      });

      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid && transports[sid]) delete transports[sid];
      };

      const store = createGraphStore();
      const service = new MindMapService(store);
      const server = createMcpServer(service);
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Bad Request: No valid session ID provided" },
      id: null,
    });
  } catch {
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.delete("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"];
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transports[sessionId].handleRequest(req, res);
});

app.listen(port, "0.0.0.0", () => {
  console.log(`MCP HTTP server listening on http://localhost:${port}/mcp`);
});
