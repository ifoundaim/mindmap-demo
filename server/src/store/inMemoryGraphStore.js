import { uniqueLower } from "../lib/text.js";
import { DEFAULT_CONTEXT_PROFILES } from "../domain/constants.js";

function edgeKey(fromId, type, toId) {
  return `${fromId}::${type}::${toId}`;
}

export class InMemoryGraphStore {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map();
    this.evidence = new Map();
    this.eventByHash = new Map();
    this.profiles = new Map();
    this.conversationProfiles = new Map();

    for (const profile of DEFAULT_CONTEXT_PROFILES) {
      this.profiles.set(profile.profile_id, {
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
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
    this.evidence.set(event.event_id, {
      ...event,
      assigned_profiles: event.assigned_profiles || [],
      profile_scores: event.profile_scores || {},
      classification_confidence: event.classification_confidence || 0,
      needs_review: Boolean(event.needs_review),
      import_metadata: event.import_metadata || undefined,
      capability: event.capability || undefined,
    });
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

  setProfile(profileId, profileData) {
    const existing = this.profiles.get(profileId);
    const next = {
      ...(existing || {}),
      ...profileData,
      profile_id: profileId,
      updated_at: new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
    };
    this.profiles.set(profileId, next);
    return next;
  }

  getProfile(profileId) {
    return this.profiles.get(profileId) || null;
  }

  listProfiles() {
    return Array.from(this.profiles.values());
  }

  setConversationProfile(conversationKey, profileId) {
    this.conversationProfiles.set(conversationKey, profileId);
    return { conversation_key: conversationKey, profile_id: profileId };
  }

  getConversationProfile(conversationKey) {
    return this.conversationProfiles.get(conversationKey) || null;
  }
}
