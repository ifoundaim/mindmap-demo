import { randomUUID } from "node:crypto";
import { ingestInsight } from "../ingestion/ingest.js";
import { LogInsightSchema, SessionBootstrapSchema, LinkNodesSchema } from "../helix/schema.js";
import {
  scoreConnections,
  findBridgeNodes,
  findContradictions,
  buildTimeline,
} from "../analytics/graphAnalytics.js";
import { metrics } from "../observability/metrics.js";

export class MindMapService {
  constructor(store) {
    this.store = store;
  }

  async sessionBootstrap(payload) {
    metrics.increment("tool_calls");
    const parsed = SessionBootstrapSchema.parse(payload);
    const result = await ingestInsight(this.store, {
      conversation_key: parsed.conversation_key,
      turn_key: parsed.turn_key,
      summary: parsed.message,
      raw_excerpt: parsed.raw_excerpt || parsed.message,
      source: "mcp_initial",
      tags: parsed.tags || [],
      related_node_ids: parsed.related_node_ids || [],
    });
    if (result.inserted) metrics.increment("events_inserted");
    else metrics.increment("events_deduped");

    // Optional structured context extraction as incremental entries.
    let contextInserts = 0;
    const context = parsed.context || {};
    for (const [key, value] of Object.entries(context)) {
      if (typeof value !== "string" || !value.trim()) continue;
      const contextEvent = await ingestInsight(this.store, {
        conversation_key: parsed.conversation_key,
        turn_key: `${parsed.turn_key}-${key}`,
        summary: `${key}: ${value}`,
        raw_excerpt: value,
        source: "mcp_initial",
        tags: [key, ...(parsed.tags || [])],
        related_node_ids: parsed.related_node_ids || [],
      });
      if (contextEvent.inserted) contextInserts += 1;
    }

    return {
      session_id: `${parsed.conversation_key}::${parsed.turn_key}`,
      captured_items: Number(result.inserted) + contextInserts,
      skipped_duplicates: Number(!result.inserted),
      result,
    };
  }

  async logInsight(payload) {
    metrics.increment("tool_calls");
    const parsed = LogInsightSchema.parse(payload);
    const result = await ingestInsight(this.store, {
      conversation_key: parsed.conversation_key,
      turn_key: parsed.turn_key,
      summary: parsed.message,
      raw_excerpt: parsed.raw_excerpt || parsed.message,
      source: "mcp_explicit",
      tags: parsed.tags || [],
      related_node_ids: parsed.related_node_ids || [],
    });
    if (result.inserted) metrics.increment("events_inserted");
    else metrics.increment("events_deduped");
    return result;
  }

  async linkNodes(payload) {
    metrics.increment("tool_calls");
    const parsed = LinkNodesSchema.parse(payload);
    const timestamp = new Date().toISOString();
    const evidenceId = parsed.evidence_id || randomUUID();
    await this.store.upsertNode({
      id: parsed.from_id,
      label: parsed.from_id,
      details: "",
      tags: [],
      category: "linked",
      status: "idea",
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      source_count: 1,
    });
    await this.store.upsertNode({
      id: parsed.to_id,
      label: parsed.to_id,
      details: "",
      tags: [],
      category: "linked",
      status: "idea",
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      source_count: 1,
    });
    const edge = await this.store.upsertEdge({
      from_id: parsed.from_id,
      to_id: parsed.to_id,
      type: parsed.type,
      weight: parsed.weight,
      evidence_ids: [evidenceId],
      first_seen_at: timestamp,
      last_seen_at: timestamp,
    });
    return { linked: true, edge };
  }

  async findConnections({ nodeId, limit = 8, types = [] }) {
    if (typeof this.store.queryConnections === "function") {
      const remote = await this.store.queryConnections({ nodeId, limit, types });
      if (remote && remote.matches) return remote;
    }

    const node = this.store.getNode(nodeId);
    if (!node) return { node: null, matches: [] };
    const nodes = this.store.listNodes();
    const edges = this.store
      .listEdges()
      .filter((e) => (e.from_id === nodeId || e.to_id === nodeId) && (!types.length || types.includes(e.type)));
    const nodesById = new Map(nodes.map((n) => [n.id, n]));
    const scored = scoreConnections(node, edges, nodesById)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    return { node, matches: scored };
  }

  async recommendNextActions(limit = 8) {
    if (typeof this.store.queryRecommendations === "function") {
      const remote = await this.store.queryRecommendations({ limit });
      if (remote && (remote.actions || remote.recommendations)) {
        return remote.actions || remote.recommendations;
      }
    }

    const nodes = this.store.listNodes();
    const edges = this.store.listEdges();
    const blocked = nodes.filter((n) => n.status === "blocked");
    const opportunities = edges.filter((e) => e.type === "enables" || e.type === "supports_goal");
    const actions = [];
    for (const b of blocked) {
      const related = opportunities.filter((e) => e.to_id === b.id || e.from_id === b.id);
      for (const rel of related) {
        actions.push({
          nodeId: b.id,
          reason: `Unblock via ${rel.type}`,
          confidence: rel.weight,
        });
      }
    }
    if (!actions.length) {
      for (const op of opportunities.slice(0, limit)) {
        actions.push({
          nodeId: op.to_id,
          reason: `Amplify ${op.type}`,
          confidence: op.weight,
        });
      }
    }
    return actions.slice(0, limit);
  }

  async getInsights() {
    if (typeof this.store.queryInsights === "function") {
      const remote = await this.store.queryInsights();
      if (remote && remote.top_bridges) {
        return { ...remote, metrics: metrics.snapshot() };
      }
    }

    const nodes = this.store.listNodes();
    const edges = this.store.listEdges();
    const evidence = Array.from(this.store.evidence.values());
    return {
      top_bridges: findBridgeNodes(nodes, edges, 6),
      contradictions: findContradictions(edges),
      timeline: buildTimeline(evidence),
      metrics: metrics.snapshot(),
    };
  }
}
