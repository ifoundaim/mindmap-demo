import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod/v4";
import { EDGE_TYPES } from "../domain/constants.js";
import { RecallContextOutputSchema } from "../helix/schema.js";

const MEMORY_FIRST_POLICY = `Memory-first behavior:
1) At the start of each new conversation, call mindmap.session_bootstrap once with the first meaningful user message.
2) Before strategic answers, read active profile via mindmap.get_context_profile and call mindmap.recall_context using that profile.
3) If no profile is set, default to full_context or explicitly set one via mindmap.set_context_profile.
4) If user gives a durable fact, preference, goal, blocker, or decision, call mindmap.log_insight.
5) If user states dependency/conflict/enabler between ideas, call mindmap.link_nodes.
6) Use stable conversation_key and unique turn_key per turn. Avoid repeated log_insight calls for the same text.
7) If user requests complete context, override to full_context for that response.
8) If memory context is used in final answer, mention it came from prior logged context.`;

export function createMcpServer(service) {
  const server = new McpServer({
    name: "mindmap-graph-mcp",
    version: "1.0.0",
  });

  server.registerPrompt(
    "mindmap.memory_first_policy",
    {
      description: "Prompt policy that enforces memory-first behavior for this MCP toolset.",
    },
    async () => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: MEMORY_FIRST_POLICY,
            },
          },
        ],
      };
    },
  );

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
    "mindmap.set_context_profile",
    {
      description: "Set or update a context profile and optionally bind it to a conversation.",
      inputSchema: {
        profile_id: z.string(),
        label: z.string(),
        mode: z.enum(["fixed", "custom"]).default("custom"),
        tags: z.array(z.string()).default([]),
        node_ids: z.array(z.string()).default([]),
        event_ids: z.array(z.string()).default([]),
        include_full_context: z.boolean().default(false),
        conversation_key: z.string().optional(),
      },
    },
    async (args) => {
      const result = await service.setContextProfile(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.get_context_profile",
    {
      description: "Get a profile by id or the active profile for a conversation.",
      inputSchema: {
        profile_id: z.string().optional(),
        conversation_key: z.string().optional(),
      },
    },
    async (args) => {
      const result = await service.getContextProfile(args);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result,
      };
    },
  );

  server.registerTool(
    "mindmap.list_context_profiles",
    {
      description: "List available fixed and custom context profiles.",
      inputSchema: {},
    },
    async () => {
      const result = await service.listContextProfiles();
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
    "mindmap.recall_context",
    {
      description:
        "Recall relevant long-term context for a query, including evidence, contradictions, and suggested actions.",
      inputSchema: {
        query: z.string(),
        conversation_key: z.string().optional(),
        profile_id: z.string().optional(),
        use_profile_filtering: z.boolean().default(true),
        top_k: z.number().int().min(1).max(20).default(8),
        include_contradictions: z.boolean().default(true),
        include_actions: z.boolean().default(true),
        tags: z.array(z.string()).default([]),
        node_ids: z.array(z.string()).default([]),
      },
      outputSchema: RecallContextOutputSchema,
    },
    async (args) => {
      const result = await service.recallContext(args);
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
