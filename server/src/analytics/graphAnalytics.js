function overlapScore(a = [], b = []) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (!sa.size || !sb.size) return 0;
  let overlap = 0;
  for (const item of sa) {
    if (sb.has(item)) overlap += 1;
  }
  return overlap / Math.max(sa.size, sb.size);
}

export function scoreConnections(node, edges, nodesById) {
  return edges.map((edge) => {
    const target = nodesById.get(edge.to_id) || nodesById.get(edge.from_id);
    const tagScore = overlapScore(node?.tags || [], target?.tags || []);
    const score = Math.min(1, edge.weight * 0.7 + tagScore * 0.3);
    return { ...edge, score, target };
  });
}

export function findBridgeNodes(nodes, edges, topN = 8) {
  const counts = new Map();
  for (const n of nodes) counts.set(n.id, 0);
  for (const e of edges) {
    counts.set(e.from_id, (counts.get(e.from_id) || 0) + 1);
    counts.set(e.to_id, (counts.get(e.to_id) || 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([nodeId, degree]) => ({ nodeId, degree }));
}

export function findContradictions(edges) {
  return edges.filter((e) => e.type === "conflicts_with");
}

export function buildTimeline(evidence) {
  const buckets = new Map();
  for (const e of evidence) {
    const day = e.timestamp.slice(0, 10);
    const bucket = buckets.get(day) || { day, events: 0, sources: new Set() };
    bucket.events += 1;
    bucket.sources.add(e.source);
    buckets.set(day, bucket);
  }
  return Array.from(buckets.values())
    .map((x) => ({ day: x.day, events: x.events, sources: x.sources.size }))
    .sort((a, b) => a.day.localeCompare(b.day));
}
