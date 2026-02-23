export const HELIX_SCHEMA_QUERIES = {
  endpoints: {
    createNode: process.env.HELIX_ENDPOINT_CREATE_NODE || "CreateNode",
    upsertEdge: process.env.HELIX_ENDPOINT_UPSERT_EDGE || "UpsertEdge",
    upsertEvidence: process.env.HELIX_ENDPOINT_UPSERT_EVIDENCE || "UpsertEvidence",
    findConnections: process.env.HELIX_ENDPOINT_FIND_CONNECTIONS || "FindConnections",
    recommendNextActions: process.env.HELIX_ENDPOINT_RECOMMEND_NEXT_ACTIONS || "RecommendNextActions",
    graphInsights: process.env.HELIX_ENDPOINT_GRAPH_INSIGHTS || "GraphInsights",
    setContextProfile: process.env.HELIX_ENDPOINT_SET_CONTEXT_PROFILE || "SetContextProfile",
    getContextProfile: process.env.HELIX_ENDPOINT_GET_CONTEXT_PROFILE || "GetContextProfile",
    listContextProfiles: process.env.HELIX_ENDPOINT_LIST_CONTEXT_PROFILES || "ListContextProfiles",
    setConversationProfile: process.env.HELIX_ENDPOINT_SET_CONVERSATION_PROFILE || "SetConversationProfile",
    getConversationProfile: process.env.HELIX_ENDPOINT_GET_CONVERSATION_PROFILE || "GetConversationProfile",
  },
  createNodes: `
    QUERY CreateNode(
      id: String,
      label: String,
      details: String,
      category: String,
      status: String,
      first_seen_at: String,
      last_seen_at: String,
      source_count: Int
    ) => {
      UPSERT (n:MindMapNode {id: id}) SET
        n.label = label,
        n.details = details,
        n.category = category,
        n.status = status,
        n.first_seen_at = first_seen_at,
        n.last_seen_at = last_seen_at,
        n.source_count = source_count
      RETURN n
    }
  `,
  createEdges: `
    QUERY UpsertEdge(
      from_id: String,
      to_id: String,
      type: String,
      weight: Float,
      first_seen_at: String,
      last_seen_at: String
    ) => {
      MATCH (a:MindMapNode {id: from_id}), (b:MindMapNode {id: to_id})
      UPSERT (a)-[e:RELATES {type: type, to_id: to_id}]->(b) SET
        e.weight = weight,
        e.first_seen_at = first_seen_at,
        e.last_seen_at = last_seen_at
      RETURN e
    }
  `,
  createEvidence: `
    QUERY UpsertEvidence(
      event_id: String,
      conversation_key: String,
      turn_key: String,
      source: String,
      summary: String,
      raw_excerpt: String,
      timestamp: String,
      hash_signature: String
    ) => {
      UPSERT (e:Evidence {hash_signature: hash_signature}) SET
        e.event_id = event_id,
        e.conversation_key = conversation_key,
        e.turn_key = turn_key,
        e.source = source,
        e.summary = summary,
        e.raw_excerpt = raw_excerpt,
        e.timestamp = timestamp
      RETURN e
    }
  `,
};

export const HELIX_UNIQUENESS_CONSTRAINTS = {
  nodeId: "MindMapNode.id",
  evidenceHash: "Evidence.hash_signature",
  edgeIdentity: "RELATES(type,to_id) scoped to source node",
};
