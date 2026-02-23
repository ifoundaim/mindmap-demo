import { uniqueLower } from "../lib/text.js";

function edgeKey(fromId, type, toId) {
  return `${fromId}::${type}::${toId}`;
}

export class InMemoryGraphStore {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.evidence = new Map();
    this.eventByHash = new Map();
  }

  upsertNode(node) {
    const now = node.last_seen_at;
    const existing = this.nodes.get(node.id);
    if (!existing) {
      this.nodes.set(node.id, { ...node, tags: uniqueLower(node.tags) });
      return this.nodes.get(node.id);
    }

    const merged = {
      ...existing,
      ...node,
      tags: uniqueLower([...(existing.tags || []), ...(node.tags || [])]),
      first_seen_at: existing.first_seen_at,
      last_seen_at: now,
      source_count: (existing.source_count || 1) + 1,
    };
    this.nodes.set(node.id, merged);
    return merged;
  }

  upsertEdge(edge) {
    const key = edgeKey(edge.from_id, edge.type, edge.to_id);
    const existing = this.edges.get(key);
    if (!existing) {
      const entry = { ...edge, evidence_ids: [...(edge.evidence_ids || [])] };
      this.edges.set(key, entry);
      return entry;
    }
    const merged = {
      ...existing,
      weight: Math.min(1, Math.max(existing.weight, edge.weight)),
      evidence_ids: Array.from(new Set([...(existing.evidence_ids || []), ...(edge.evidence_ids || [])])),
      last_seen_at: edge.last_seen_at,
    };
    this.edges.set(key, merged);
    return merged;
  }

  insertEvidence(event) {
    if (this.eventByHash.has(event.hash_signature)) {
      return { duplicate: true, existingEventId: this.eventByHash.get(event.hash_signature) };
    }
    this.evidence.set(event.event_id, event);
    this.eventByHash.set(event.hash_signature, event.event_id);
    return { duplicate: false, event };
  }

  getEvidenceByHash(hashSignature) {
    const eventId = this.eventByHash.get(hashSignature);
    if (!eventId) return null;
    return this.evidence.get(eventId) || null;
  }

  listEvidenceByConversation(conversationKey) {
    return Array.from(this.evidence.values()).filter((x) => x.conversation_key === conversationKey);
  }

  getNode(id) {
    return this.nodes.get(id) || null;
  }

  listNodes() {
    return Array.from(this.nodes.values());
  }

  listEdges() {
    return Array.from(this.edges.values());
  }
}
