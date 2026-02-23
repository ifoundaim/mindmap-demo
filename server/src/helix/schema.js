import { z } from "zod";
import { EDGE_TYPES, NODE_STATUS, SOURCE_TYPES } from "../domain/constants.js";

export const NodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  details: z.string().default(""),
  tags: z.array(z.string()).default([]),
  category: z.string().default("general"),
  status: z.enum(NODE_STATUS).default("idea"),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
  source_count: z.number().int().nonnegative().default(1),
});

export const EdgeSchema = z.object({
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  type: z.enum(EDGE_TYPES),
  weight: z.number().min(0).max(1),
  evidence_ids: z.array(z.string()).default([]),
  first_seen_at: z.string(),
  last_seen_at: z.string(),
});

export const EvidenceSchema = z.object({
  event_id: z.string().min(1),
  conversation_key: z.string().min(1),
  turn_key: z.string().min(1),
  source: z.enum(SOURCE_TYPES),
  summary: z.string().min(1),
  raw_excerpt: z.string().default(""),
  timestamp: z.string(),
  hash_signature: z.string().min(1),
  embedding_vector: z.array(z.number()).optional(),
  tags: z.array(z.string()).default([]),
  related_node_ids: z.array(z.string()).default([]),
  assigned_profiles: z.array(z.string()).default([]),
  profile_scores: z.record(z.string(), z.number()).default({}),
  classification_confidence: z.number().min(0).max(1).default(0),
  needs_review: z.boolean().default(false),
  import_metadata: z
    .object({
      kind: z.enum(["cursor_chat", "git_commit", "git_diff"]).optional(),
      workspace: z.string().optional(),
      repository: z.string().optional(),
      repo_path: z.string().optional(),
      branch: z.string().optional(),
      commit_hash: z.string().optional(),
      author: z.string().optional(),
      files_touched: z.array(z.string()).default([]),
      chat_title: z.string().optional(),
      transcript_turn_index: z.number().int().nonnegative().optional(),
    })
    .optional(),
  capability: z
    .object({
      labels: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).default(0),
      reason: z.string().default(""),
    })
    .optional(),
});

export const SessionBootstrapSchema = z.object({
  conversation_key: z.string().min(1),
  turn_key: z.string().min(1),
  message: z.string().min(1),
  raw_excerpt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  related_node_ids: z.array(z.string()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

export const LogInsightSchema = SessionBootstrapSchema.extend({
  confidence: z.number().min(0).max(1).optional(),
});

export const LinkNodesSchema = z.object({
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  type: z.enum(EDGE_TYPES),
  weight: z.number().min(0).max(1).default(0.5),
  evidence_id: z.string().optional(),
});

export const RecallContextSchema = z.object({
  query: z.string().min(1),
  conversation_key: z.string().optional(),
  profile_id: z.string().optional(),
  use_profile_filtering: z.boolean().default(true),
  top_k: z.number().int().min(1).max(20).default(8),
  include_contradictions: z.boolean().default(true),
  include_actions: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
  node_ids: z.array(z.string()).default([]),
  sources: z.array(z.enum(SOURCE_TYPES)).default([]),
});

export const RecallContextEvidenceSchema = z.object({
  event_id: z.string().min(1),
  timestamp: z.string(),
  source: z.enum(SOURCE_TYPES),
  excerpt: z.string(),
  import_metadata: z.record(z.string(), z.unknown()).optional(),
  capability: z
    .object({
      labels: z.array(z.string()).default([]),
      confidence: z.number().min(0).max(1).default(0),
      reason: z.string().default(""),
    })
    .optional(),
});

export const RecallContextMatchSchema = z.object({
  node_id: z.string().min(1),
  label: z.string().min(1),
  relevance_score: z.number().min(0).max(1),
  relationship_types: z.array(z.enum(EDGE_TYPES)),
  summary: z.string(),
  evidence: z.array(RecallContextEvidenceSchema),
});

export const RecallContextContradictionSchema = z.object({
  from_id: z.string().min(1),
  to_id: z.string().min(1),
  type: z.literal("conflicts_with"),
  weight: z.number().min(0).max(1),
  explanation: z.string(),
});

export const RecallContextActionSchema = z.object({
  nodeId: z.string().min(1),
  reason: z.string(),
  confidence: z.number().min(0).max(1),
});

export const RecallContextOutputSchema = z.object({
  query: z.string().min(1),
  matches: z.array(RecallContextMatchSchema),
  contradictions: z.array(RecallContextContradictionSchema),
  recommended_actions: z.array(RecallContextActionSchema),
  meta: z.object({
    profile_applied: z.string(),
    top_k: z.number().int().min(1).max(20),
    total_candidates: z.number().int().nonnegative(),
    dedupe_applied: z.boolean(),
  }),
});

export const ContextProfileSchema = z.object({
  profile_id: z.string().min(1),
  label: z.string().min(1),
  mode: z.enum(["fixed", "custom"]).default("custom"),
  tags: z.array(z.string()).default([]),
  node_ids: z.array(z.string()).default([]),
  event_ids: z.array(z.string()).default([]),
  include_full_context: z.boolean().default(false),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const SetContextProfileSchema = z.object({
  profile_id: z.string().min(1),
  label: z.string().min(1),
  mode: z.enum(["fixed", "custom"]).default("custom"),
  tags: z.array(z.string()).default([]),
  node_ids: z.array(z.string()).default([]),
  event_ids: z.array(z.string()).default([]),
  include_full_context: z.boolean().default(false),
  conversation_key: z.string().optional(),
});

export const GetContextProfileSchema = z.object({
  profile_id: z.string().optional(),
  conversation_key: z.string().optional(),
});

export const ImportCursorChatsSchema = z.object({
  conversation_key: z.string().min(1),
  workspace: z.string().optional(),
  chats: z
    .array(
      z.object({
        chat_id: z.string().min(1).optional(),
        title: z.string().optional(),
        timestamp: z.string().optional(),
        turn_key: z.string().optional(),
        turn_index: z.number().int().nonnegative().optional(),
        message: z.string().min(1),
        raw_excerpt: z.string().optional(),
        tags: z.array(z.string()).default([]),
        related_node_ids: z.array(z.string()).default([]),
      }),
    )
    .min(1),
});

export const ImportGitHistorySchema = z.object({
  conversation_key: z.string().min(1).default("git-history"),
  repository: z.string().optional(),
  repo_path: z.string().optional(),
  branch: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(50),
  commits: z
    .array(
      z.object({
        hash: z.string().min(1),
        author: z.string().optional(),
        date: z.string().optional(),
        subject: z.string().min(1),
        body: z.string().optional(),
        files: z.array(z.string()).default([]),
      }),
    )
    .default([]),
});
