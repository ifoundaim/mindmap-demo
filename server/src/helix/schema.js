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
