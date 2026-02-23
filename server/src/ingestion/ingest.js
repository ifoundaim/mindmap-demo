import { randomUUID } from "node:crypto";
import { DEFAULT_EDGE_TYPE } from "../domain/constants.js";
import { makeEventHash, detectSemanticDuplicate } from "./dedupe.js";
import { extractCandidateNodes, mergeTags } from "./extract.js";

function isoNow() {
  return new Date().toISOString();
}

export async function ingestInsight(store, payload) {
  const timestamp = payload.timestamp || isoNow();
  const eventId = payload.event_id || randomUUID();
  const hashSignature = payload.hash_signature || makeEventHash(payload);
  const relatedNodeIds = payload.related_node_ids || [];
  const tags = mergeTags(payload.tags || []);

  const deterministicDuplicate = store.getEvidenceByHash(hashSignature);
  if (deterministicDuplicate) {
    return {
      inserted: false,
      reason: "duplicate_hash",
      existingEventId: deterministicDuplicate.event_id,
    };
  }

  const recent = store
    .listEvidenceByConversation(payload.conversation_key)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 50);
  const semantic = detectSemanticDuplicate(
    { summary: payload.summary },
    recent,
    Number(process.env.SEMANTIC_DEDUPE_THRESHOLD || 0.92),
  );
  if (semantic.duplicate) {
    return {
      inserted: false,
      reason: "duplicate_semantic",
      existingEventId: semantic.matchedEventId,
      similarity: semantic.score,
    };
  }

  const event = {
    event_id: eventId,
    conversation_key: payload.conversation_key,
    turn_key: payload.turn_key,
    source: payload.source,
    summary: payload.summary,
    raw_excerpt: payload.raw_excerpt || "",
    timestamp,
    hash_signature: hashSignature,
    tags,
    related_node_ids: relatedNodeIds,
  };

  const evidenceResult = await store.insertEvidence(event);
  if (evidenceResult.duplicate) {
    return { inserted: false, reason: "duplicate_hash", existingEventId: evidenceResult.existingEventId };
  }

  const candidates = extractCandidateNodes({
    summary: payload.summary,
    tags,
    relatedNodeIds: relatedNodeIds,
  });

  const createdNodeIds = [];
  for (const candidate of candidates) {
    const node = await store.upsertNode({
      id: candidate.id,
      label: candidate.label,
      details: payload.summary,
      tags,
      category: candidate.category,
      status: "idea",
      first_seen_at: timestamp,
      last_seen_at: timestamp,
      source_count: 1,
    });
    createdNodeIds.push(node.id);
  }

  // Create co-occurrence links for freshly extracted nodes.
  for (let i = 0; i < createdNodeIds.length; i += 1) {
    for (let j = i + 1; j < createdNodeIds.length; j += 1) {
      await store.upsertEdge({
        from_id: createdNodeIds[i],
        to_id: createdNodeIds[j],
        type: DEFAULT_EDGE_TYPE,
        weight: 0.45,
        evidence_ids: [eventId],
        first_seen_at: timestamp,
        last_seen_at: timestamp,
      });
    }
  }

  return {
    inserted: true,
    eventId,
    nodeIds: createdNodeIds,
    skippedDuplicates: 0,
  };
}
