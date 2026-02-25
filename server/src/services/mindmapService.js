import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { ingestInsight } from "../ingestion/ingest.js";
import {
  LogInsightSchema,
  SessionBootstrapSchema,
  LinkNodesSchema,
  RecallContextSchema,
  SetContextProfileSchema,
  GetContextProfileSchema,
  ImportCursorChatsSchema,
  ImportGitHistorySchema,
  CollectBatchSchema,
  ExportCollectionSchema,
} from "../helix/schema.js";
import {
  scoreConnections,
  findBridgeNodes,
  findContradictions,
  buildTimeline,
} from "../analytics/graphAnalytics.js";
import { metrics } from "../observability/metrics.js";
import { jaccardSimilarity } from "../lib/text.js";
import { classifyContextProfiles } from "../ingestion/classifyProfiles.js";
import { DEFAULT_CONTEXT_PROFILES } from "../domain/constants.js";
import { normalizeCursorChatEvents, normalizeGitCommitEvents } from "../ingestion/importers.js";

async function maybeAwait(value) {
  return Promise.resolve(value);
}

const execFileAsync = promisify(execFile);

function parseGitLogOutput(stdout) {
  return String(stdout || "")
    .split("\x1e")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [header, ...fileLines] = chunk.split("\n");
      const [hash = "", author = "", date = "", subject = ""] = header.split("\t");
      const body = "";
      const files = fileLines.map((x) => x.trim()).filter(Boolean);
      return { hash, author, date, subject, body, files };
    })
    .filter((x) => x.hash && x.subject);
}

function isExplicitFullContext(text) {
  const t = String(text || "").toLowerCase();
  return t.includes("full context") || t.includes("complete context") || t.includes("all context");
}

export class MindMapService {
  constructor(store) {
    this.store = store;
  }

  async sessionBootstrap(payload) {
    metrics.increment("tool_calls");
    const parsed = SessionBootstrapSchema.parse(payload);
    const profiles = await maybeAwait(this.store.listProfiles());
    const profileAssignment = await classifyContextProfiles({
      summary: parsed.message,
      tags: parsed.tags || [],
      relatedNodeIds: parsed.related_node_ids || [],
      profiles,
    });

    const result = await ingestInsight(this.store, {
      conversation_key: parsed.conversation_key,
      turn_key: parsed.turn_key,
      summary: parsed.message,
      raw_excerpt: parsed.raw_excerpt || parsed.message,
      source: "mcp_initial",
      tags: parsed.tags || [],
      related_node_ids: parsed.related_node_ids || [],
      assigned_profiles: profileAssignment.assignedProfiles,
      profile_scores: profileAssignment.profileScores,
      classification_confidence: profileAssignment.classificationConfidence,
      needs_review: profileAssignment.needsReview,
    });
    if (result.inserted) metrics.increment("events_inserted");
    else metrics.increment("events_deduped");
    if (result.inserted) metrics.increment("profile_assignments_total");
    if (profileAssignment.needsReview) metrics.increment("needs_review_total");

    // Set initial conversation profile if absent.
    const existingConversationProfile = await maybeAwait(
      this.store.getConversationProfile(parsed.conversation_key),
    );
    if (!existingConversationProfile) {
      await maybeAwait(
        this.store.setConversationProfile(
          parsed.conversation_key,
          profileAssignment.assignedProfiles[0] || "full_context",
        ),
      );
    }

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
      profile_assignment: profileAssignment,
      result,
    };
  }

  async logInsight(payload) {
    metrics.increment("tool_calls");
    const parsed = LogInsightSchema.parse(payload);
    const profiles = await maybeAwait(this.store.listProfiles());
    const profileAssignment = await classifyContextProfiles({
      summary: parsed.message,
      tags: parsed.tags || [],
      relatedNodeIds: parsed.related_node_ids || [],
      profiles,
    });

    const result = await ingestInsight(this.store, {
      conversation_key: parsed.conversation_key,
      turn_key: parsed.turn_key,
      summary: parsed.message,
      raw_excerpt: parsed.raw_excerpt || parsed.message,
      source: "mcp_explicit",
      tags: parsed.tags || [],
      related_node_ids: parsed.related_node_ids || [],
      assigned_profiles: profileAssignment.assignedProfiles,
      profile_scores: profileAssignment.profileScores,
      classification_confidence: profileAssignment.classificationConfidence,
      needs_review: profileAssignment.needsReview,
    });
    if (result.inserted) metrics.increment("events_inserted");
    else metrics.increment("events_deduped");
    if (result.inserted) metrics.increment("profile_assignments_total");
    if (profileAssignment.needsReview) metrics.increment("needs_review_total");

    const conversationProfile = await maybeAwait(this.store.getConversationProfile(parsed.conversation_key));
    if (!conversationProfile && result.inserted) {
      await maybeAwait(
        this.store.setConversationProfile(
          parsed.conversation_key,
          profileAssignment.assignedProfiles[0] || "full_context",
        ),
      );
    }

    return { ...result, profile_assignment: profileAssignment };
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

  async recallContext(payload) {
    metrics.increment("tool_calls");
    const parsed = RecallContextSchema.parse(payload);

    const query = parsed.query;
    const nodes = this.store.listNodes();
    const edges = this.store.listEdges();
    const evidence = Array.from(this.store.evidence?.values?.() || []);

    const scopedEvidenceBase = parsed.conversation_key
      ? evidence.filter((e) => e.conversation_key === parsed.conversation_key)
      : evidence;

    let profileApplied = parsed.profile_id || null;
    if (!profileApplied && parsed.conversation_key) {
      profileApplied = await maybeAwait(this.store.getConversationProfile(parsed.conversation_key));
    }
    if (!profileApplied || isExplicitFullContext(parsed.query)) {
      profileApplied = "full_context";
      if (parsed.conversation_key) {
        metrics.increment("profile_overrides_total");
        await maybeAwait(this.store.setConversationProfile(parsed.conversation_key, profileApplied));
      }
    }

    let profile = await maybeAwait(this.store.getProfile(profileApplied));
    if (parsed.use_profile_filtering && profileApplied !== "full_context" && !profile) {
      profileApplied = "full_context";
      profile = await maybeAwait(this.store.getProfile(profileApplied));
      metrics.increment("profile_overrides_total");
    }

    const profileTagFilter = new Set(((profile?.tags || []) || []).map((t) => String(t).toLowerCase()));
    const profileNodeFilter = new Set(profile?.node_ids || []);
    const profileEventFilter = new Set(profile?.event_ids || []);

    const scopedEvidence = parsed.use_profile_filtering
      ? scopedEvidenceBase.filter((e) => {
          if (profileApplied === "full_context") return true;
          const evidenceProfiles = new Set((e.assigned_profiles || []).map((p) => String(p).toLowerCase()));
          if (evidenceProfiles.has(String(profileApplied).toLowerCase())) return true;
          const evidenceTags = new Set((e.tags || []).map((t) => String(t).toLowerCase()));
          for (const t of profileTagFilter) {
            if (evidenceTags.has(t)) return true;
          }
          const rel = e.related_node_ids || [];
          for (const nid of rel) {
            if (profileNodeFilter.has(nid)) return true;
          }
          if (profileEventFilter.has(e.event_id)) return true;
          return false;
        })
      : scopedEvidenceBase;

    const constrainedNodeIds = new Set(parsed.node_ids || []);
    const tagConstraints = new Set((parsed.tags || []).map((t) => t.toLowerCase()));
    const sourceConstraints = new Set(parsed.sources || []);

    const candidates = nodes
      .filter((n) => {
        if (parsed.use_profile_filtering && profileApplied !== "full_context") {
          const nodeTagsLower = new Set((n.tags || []).map((t) => String(t).toLowerCase()));
          let profileHit = profileNodeFilter.has(n.id);
          if (!profileHit) {
            for (const t of profileTagFilter) {
              if (nodeTagsLower.has(t)) {
                profileHit = true;
                break;
              }
            }
          }
          if (!profileHit) {
            const relatedEvidenceForNode = scopedEvidence.filter((e) =>
              (e.related_node_ids || []).includes(n.id),
            );
            const evidenceHit = relatedEvidenceForNode.some((e) => profileEventFilter.has(e.event_id));
            if (!evidenceHit) return false;
          }
        }

        if (constrainedNodeIds.size && !constrainedNodeIds.has(n.id)) return false;
        if (!tagConstraints.size) return true;
        const nodeTags = new Set((n.tags || []).map((t) => String(t).toLowerCase()));
        for (const t of tagConstraints) {
          if (nodeTags.has(t)) return true;
        }
        return false;
      })
      .map((node) => {
        const nodeText = `${node.label} ${node.details || ""} ${(node.tags || []).join(" ")}`;
        const nodeScore = jaccardSimilarity(query, nodeText);

        const relatedEvidence = scopedEvidence.filter((e) => (e.related_node_ids || []).includes(node.id));
        const semanticEvidence = scopedEvidence
          .map((e) => ({
            ...e,
            sim: jaccardSimilarity(query, `${e.summary} ${e.raw_excerpt || ""}`),
          }))
          .filter((e) => e.sim >= 0.1)
          .sort((a, b) => b.sim - a.sim);

        const evidenceList = [...relatedEvidence, ...semanticEvidence]
          .filter((e) => !sourceConstraints.size || sourceConstraints.has(e.source))
          .filter((e, idx, arr) => arr.findIndex((x) => x.event_id === e.event_id) === idx)
          .slice(0, 3);

        const evidenceBoost = evidenceList.length
          ? Math.max(...evidenceList.map((e) => e.sim || jaccardSimilarity(query, e.summary))) * 0.35
          : 0;
        const relevance = Math.min(1, nodeScore + evidenceBoost);
        if (sourceConstraints.size && evidenceList.length === 0) return null;

        const relationshipTypes = Array.from(
          new Set(
            edges
              .filter((e) => e.from_id === node.id || e.to_id === node.id)
              .map((e) => e.type),
          ),
        );

        return {
          node_id: node.id,
          label: node.label,
          relevance_score: relevance,
          relationship_types: relationshipTypes,
          summary: node.details || evidenceList[0]?.summary || "",
          evidence: evidenceList.map((e) => ({
            event_id: e.event_id,
            timestamp: e.timestamp,
            source: e.source,
            excerpt: e.raw_excerpt || e.summary,
            import_metadata: e.import_metadata,
            capability: e.capability,
          })),
        };
      })
      .filter(Boolean)
      .filter((x) => x.relevance_score > 0)
      .sort((a, b) => b.relevance_score - a.relevance_score);

    const matches = candidates.slice(0, parsed.top_k);
    const matchedNodeIds = new Set(matches.map((m) => m.node_id));

    const contradictions = parsed.include_contradictions
      ? findContradictions(edges)
          .filter((e) => matchedNodeIds.has(e.from_id) || matchedNodeIds.has(e.to_id))
          .map((e) => ({
            from_id: e.from_id,
            to_id: e.to_id,
            type: e.type,
            weight: e.weight,
            explanation: `${e.from_id} ${e.type} ${e.to_id}`,
          }))
      : [];

    const recommendedActions = parsed.include_actions ? await this.recommendNextActions(parsed.top_k) : [];

    if (parsed.use_profile_filtering && parsed.top_k > 0 && matches.length === 0) {
      metrics.increment("profile_recall_misses_total");
    }

    return {
      query,
      matches,
      contradictions,
      recommended_actions: recommendedActions,
      meta: {
        profile_applied: profileApplied || "full_context",
        top_k: parsed.top_k,
        total_candidates: candidates.length,
        dedupe_applied: true,
      },
    };
  }

  async importCursorChats(payload) {
    metrics.increment("tool_calls");
    const parsed = ImportCursorChatsSchema.parse(payload);
    const knownNodeIds = (await maybeAwait(this.store.listNodes())).map((n) => n.id);
    const events = normalizeCursorChatEvents(parsed, knownNodeIds);
    const profiles = await maybeAwait(this.store.listProfiles());

    const results = [];
    for (const event of events) {
      const profileAssignment = await classifyContextProfiles({
        summary: event.summary,
        tags: event.tags || [],
        relatedNodeIds: event.related_node_ids || [],
        profiles,
      });
      const result = await ingestInsight(this.store, {
        conversation_key: event.conversation_key,
        turn_key: event.turn_key,
        summary: event.summary,
        raw_excerpt: event.raw_excerpt,
        source: event.source,
        tags: event.tags,
        related_node_ids: event.related_node_ids,
        assigned_profiles: profileAssignment.assignedProfiles,
        profile_scores: profileAssignment.profileScores,
        classification_confidence: profileAssignment.classificationConfidence,
        needs_review: event.needs_review || profileAssignment.needsReview,
        timestamp: event.timestamp,
        import_metadata: event.import_metadata,
        capability: event.capability,
      });
      if (result.inserted) metrics.increment("events_inserted");
      else metrics.increment("events_deduped");
      results.push({
        turn_key: event.turn_key,
        inserted: result.inserted,
        reason: result.reason || null,
        event_id: result.eventId || result.existingEventId || null,
      });
    }

    return {
      conversation_key: parsed.conversation_key,
      imported: results.filter((x) => x.inserted).length,
      skipped_duplicates: results.filter((x) => !x.inserted).length,
      total: results.length,
      results,
    };
  }

  async importGitHistory(payload) {
    metrics.increment("tool_calls");
    const parsed = ImportGitHistorySchema.parse(payload);
    let commits = parsed.commits || [];

    if (!commits.length && parsed.repo_path) {
      const pretty = "%x1e%H%x09%an%x09%aI%x09%s";
      const logArgs = [
        "-C",
        parsed.repo_path,
        "log",
        `--max-count=${parsed.limit}`,
        `--pretty=format:${pretty}`,
        "--name-only",
      ];
      if (parsed.branch) {
        logArgs.push(parsed.branch);
      }
      try {
        const { stdout } = await execFileAsync("git", logArgs);
        commits = parseGitLogOutput(stdout);
      } catch {
        commits = [];
      }
    } else if (commits.length) {
      commits = commits.slice(0, parsed.limit);
    }

    const knownNodeIds = (await maybeAwait(this.store.listNodes())).map((n) => n.id);
    const events = normalizeGitCommitEvents(parsed, commits, knownNodeIds);
    const profiles = await maybeAwait(this.store.listProfiles());
    const results = [];

    for (const event of events) {
      const profileAssignment = await classifyContextProfiles({
        summary: event.summary,
        tags: event.tags || [],
        relatedNodeIds: event.related_node_ids || [],
        profiles,
      });
      const result = await ingestInsight(this.store, {
        event_id: event.event_id,
        conversation_key: event.conversation_key,
        turn_key: event.turn_key,
        summary: event.summary,
        raw_excerpt: event.raw_excerpt,
        source: event.source,
        tags: event.tags,
        related_node_ids: event.related_node_ids,
        assigned_profiles: profileAssignment.assignedProfiles,
        profile_scores: profileAssignment.profileScores,
        classification_confidence: profileAssignment.classificationConfidence,
        needs_review: event.needs_review || profileAssignment.needsReview,
        timestamp: event.timestamp,
        import_metadata: event.import_metadata,
        capability: event.capability,
      });
      if (result.inserted) metrics.increment("events_inserted");
      else metrics.increment("events_deduped");
      results.push({
        turn_key: event.turn_key,
        inserted: result.inserted,
        reason: result.reason || null,
        event_id: result.eventId || result.existingEventId || null,
      });
    }

    return {
      conversation_key: parsed.conversation_key,
      imported: results.filter((x) => x.inserted).length,
      skipped_duplicates: results.filter((x) => !x.inserted).length,
      total: results.length,
      results,
    };
  }

  async collectBatch(payload) {
    metrics.increment("tool_calls");
    const parsed = CollectBatchSchema.parse(payload);
    const batchId = parsed.batch_id || `batch-${Date.now()}`;
    const itemResults = [];
    let entriesInserted = 0;
    let entriesDeduped = 0;
    let contextItemsInserted = 0;

    for (let idx = 0; idx < parsed.entries.length; idx += 1) {
      const entry = parsed.entries[idx];
      const turnKey = entry.turn_key || `${batchId}-turn-${idx + 1}`;
      const basePayload = {
        conversation_key: parsed.conversation_key,
        turn_key: turnKey,
        message: entry.message,
        raw_excerpt: entry.raw_excerpt,
        tags: entry.tags || [],
        related_node_ids: entry.related_node_ids || [],
        context: entry.context,
      };

      const outcome =
        entry.source === "mcp_initial"
          ? await this.sessionBootstrap(basePayload)
          : await this.logInsight(basePayload);

      const inserted = Boolean(outcome?.inserted || outcome?.result?.inserted);
      if (inserted) entriesInserted += 1;
      else entriesDeduped += 1;
      contextItemsInserted += Number(outcome?.captured_items || 0) - Number(inserted);

      itemResults.push({
        turn_key: turnKey,
        source: entry.source,
        inserted,
        skipped_duplicates: Number(!inserted),
        event_id: outcome?.eventId || outcome?.result?.eventId || outcome?.existingEventId || null,
      });
    }

    const linked = [];
    for (const link of parsed.links || []) {
      const result = await this.linkNodes(link);
      linked.push(result.edge);
    }

    return {
      conversation_key: parsed.conversation_key,
      batch_id: batchId,
      totals: {
        entries_received: parsed.entries.length,
        entries_inserted: entriesInserted,
        entries_deduped: entriesDeduped,
        context_items_inserted: Math.max(0, contextItemsInserted),
        links_applied: linked.length,
      },
      items: itemResults,
      linked_edges: linked,
    };
  }

  async exportCollection(payload = {}) {
    const parsed = ExportCollectionSchema.parse(payload);
    const allNodes = await maybeAwait(this.store.listNodes());
    const allEdges = await maybeAwait(this.store.listEdges());
    const allEvidence = Array.from(this.store.evidence?.values?.() || []);
    const allProfiles = await maybeAwait(this.store.listProfiles?.() || []);

    let filteredEvidence = parsed.include_evidence ? allEvidence : [];
    if (parsed.conversation_key) {
      filteredEvidence = filteredEvidence.filter((e) => e.conversation_key === parsed.conversation_key);
    }
    if (parsed.sources?.length) {
      const sourceSet = new Set(parsed.sources);
      filteredEvidence = filteredEvidence.filter((e) => sourceSet.has(e.source));
    }

    filteredEvidence = filteredEvidence
      .slice()
      .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
      .slice(0, parsed.limit_evidence);

    const relevantNodeIds = new Set();
    for (const e of filteredEvidence) {
      for (const nodeId of e.related_node_ids || []) relevantNodeIds.add(nodeId);
    }

    const nodes = parsed.include_nodes
      ? parsed.conversation_key
        ? allNodes.filter((n) => relevantNodeIds.has(n.id))
        : allNodes
      : [];

    const includedNodeIds = new Set(nodes.map((n) => n.id));
    const edges = parsed.include_edges
      ? parsed.conversation_key
        ? allEdges.filter((e) => includedNodeIds.has(e.from_id) || includedNodeIds.has(e.to_id))
        : allEdges
      : [];

    const sourceCounts = filteredEvidence.reduce((acc, e) => {
      const source = e.source || "unknown";
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {});

    const conversationProfile = parsed.conversation_key
      ? await maybeAwait(this.store.getConversationProfile(parsed.conversation_key))
      : null;

    return {
      meta: {
        generated_at: new Date().toISOString(),
        conversation_key: parsed.conversation_key || null,
        filters: {
          sources: parsed.sources,
          limit_evidence: parsed.limit_evidence,
        },
        counts: {
          nodes: nodes.length,
          edges: edges.length,
          evidence: filteredEvidence.length,
          profiles: parsed.include_profiles ? allProfiles.length : 0,
        },
        source_counts: sourceCounts,
        conversation_profile: conversationProfile || null,
      },
      nodes: nodes.slice().sort((a, b) => a.id.localeCompare(b.id)),
      edges: edges
        .slice()
        .sort((a, b) =>
          `${a.from_id}:${a.type}:${a.to_id}`.localeCompare(`${b.from_id}:${b.type}:${b.to_id}`),
        ),
      evidence: filteredEvidence,
      profiles: parsed.include_profiles
        ? allProfiles.slice().sort((a, b) => a.profile_id.localeCompare(b.profile_id))
        : [],
    };
  }

  async setContextProfile(payload) {
    metrics.increment("tool_calls");
    const parsed = SetContextProfileSchema.parse(payload);
    const profile = await maybeAwait(
      this.store.setProfile(parsed.profile_id, {
        profile_id: parsed.profile_id,
        label: parsed.label,
        mode: parsed.mode,
        tags: parsed.tags,
        node_ids: parsed.node_ids,
        event_ids: parsed.event_ids,
        include_full_context: parsed.include_full_context,
      }),
    );
    if (parsed.conversation_key) {
      await maybeAwait(this.store.setConversationProfile(parsed.conversation_key, parsed.profile_id));
    }
    return {
      profile,
      conversation_key: parsed.conversation_key || null,
      profile_applied: parsed.profile_id,
    };
  }

  async getContextProfile(payload) {
    const parsed = GetContextProfileSchema.parse(payload);
    if (parsed.profile_id) {
      const profile = await maybeAwait(this.store.getProfile(parsed.profile_id));
      return { profile, profile_applied: parsed.profile_id };
    }
    if (parsed.conversation_key) {
      const profileId = await maybeAwait(this.store.getConversationProfile(parsed.conversation_key));
      const profile = profileId ? await maybeAwait(this.store.getProfile(profileId)) : null;
      return { profile, profile_applied: profileId || "full_context" };
    }
    return { profile: null, profile_applied: "full_context" };
  }

  async listContextProfiles() {
    const profiles = await maybeAwait(this.store.listProfiles());
    return { profiles: profiles?.length ? profiles : DEFAULT_CONTEXT_PROFILES };
  }

  async searchDatapoints({ query, limit = 20, type = "all", sources = [] } = {}) {
    const q = String(query || "").trim().toLowerCase();
    const normalizedType = ["all", "nodes", "evidence"].includes(String(type || "").toLowerCase())
      ? String(type || "").toLowerCase()
      : "all";
    const max = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 100) : 20;
    if (!q) return { query: "", type: normalizedType, matches: [] };

    const nodes = normalizedType !== "evidence" ? await maybeAwait(this.store.listNodes()) : [];
    const evidence =
      normalizedType !== "nodes" ? Array.from(this.store.evidence?.values?.() || []) : [];
    const sourceSet = new Set((sources || []).filter(Boolean));

    const nodeMatches = nodes.map((node) => {
        const label = String(node.label || "");
        const details = String(node.details || "");
        const tags = node.tags || [];
        const haystack = `${node.id} ${label} ${details} ${tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return null;

        const score = Math.max(
          jaccardSimilarity(q, label),
          jaccardSimilarity(q, details),
          jaccardSimilarity(q, tags.join(" ")),
        );

        return {
          kind: "node",
          node_id: node.id,
          label,
          tags,
          summary: details.slice(0, 220),
          score,
        };
      })
      .filter(Boolean);

    const evidenceMatches = evidence
      .map((event) => {
        if (sourceSet.size && !sourceSet.has(event.source)) return null;
        const summary = String(event.summary || "");
        const excerpt = String(event.raw_excerpt || "");
        const tags = event.tags || [];
        const haystack = `${event.event_id} ${summary} ${excerpt} ${tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return null;
        const score = Math.max(
          jaccardSimilarity(q, summary),
          jaccardSimilarity(q, excerpt),
          jaccardSimilarity(q, tags.join(" ")),
        );
        return {
          kind: "evidence",
          event_id: event.event_id,
          label: event.turn_key || event.event_id,
          tags,
          summary: summary || excerpt,
          related_node_ids: event.related_node_ids || [],
          score,
        };
      })
      .filter(Boolean);

    const matches = [...nodeMatches, ...evidenceMatches]
      .sort((a, b) => b.score - a.score || String(a.label || "").localeCompare(String(b.label || "")))
      .slice(0, max);

    return { query: q, type: normalizedType, matches };
  }
}
