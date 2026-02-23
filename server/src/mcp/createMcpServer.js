import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { EDGE_TYPES } from "../domain/constants.js";

export function createMcpServer(service) {
  const server = new McpServer({
    name: "mindmap-graph-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "mindmap.session_bootstrap",
    {
      description:
        "Capture high-signal context on first call in a conversation. Dedupes using deterministic hash + semantic similarity.",
      inputSchema: {
        conversation_key: z.string(),
        turn_key: z.string(),
        message: z.string(),
        raw_excerpt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        related_node_ids: z.array(z.string()).optional(),
        context: z.record(z.string(), z.unknown()).optional(),
      },
    },
    async (args) => {
      const result = await service.sessionBootstrap(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.log_insight",
    {
      description: "Explicitly append a relevant insight from the current chat without duplicating prior events.",
      inputSchema: {
        conversation_key: z.string(),
        turn_key: z.string(),
        message: z.string(),
        raw_excerpt: z.string().optional(),
        tags: z.array(z.string()).optional(),
        related_node_ids: z.array(z.string()).optional(),
        confidence: z.number().min(0).max(1).optional(),
      },
    },
    async (args) => {
      const result = await service.logInsight(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.link_nodes",
    {
      description: "Create or strengthen a typed edge between two nodes.",
      inputSchema: {
        from_id: z.string(),
        to_id: z.string(),
        type: z.enum(EDGE_TYPES),
        weight: z.number().min(0).max(1).default(0.5),
        evidence_id: z.string().optional(),
      },
    },
    async (args) => {
      const result = await service.linkNodes(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.find_connections",
    {
      description: "Find strongest related nodes for a node, with weighted scoring.",
      inputSchema: {
        node_id: z.string(),
        limit: z.number().int().min(1).max(50).default(8),
        types: z.array(z.enum(EDGE_TYPES)).default([]),
      },
    },
    async ({ node_id: nodeId, limit, types }) => {
      const result = await service.findConnections({ nodeId, limit, types });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.recommend_next_actions",
    {
      description: "Recommend high-impact next steps from graph patterns and statuses.",
      inputSchema: {
        limit: z.number().int().min(1).max(50).default(8),
      },
    },
    async ({ limit }) => {
      const result = { actions: await service.recommendNextActions(limit) };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  return server;
}
