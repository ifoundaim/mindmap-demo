function pointOnSphere(index, total, radius) {
  const safeTotal = Math.max(total, 1);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const y = 1 - (index / Math.max(safeTotal - 1, 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = goldenAngle * index;
  return {
    x: Math.cos(theta) * r * radius,
    y: y * radius,
    z: Math.sin(theta) * r * radius,
  };
}

function colorFromDepth(depth) {
  const palette = ["#60a5fa", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#22d3ee"];
  return palette[Math.max(0, depth) % palette.length];
}

function firstDetailSnippets(details, maxSnippets = 2) {
  return String(details || "")
    .split(/[.!?]\s+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, maxSnippets);
}

function summarizeConnection(row, nodeLabelById) {
  const fromLabel = nodeLabelById.get(row.from_id) || row.from_id;
  const toLabel = nodeLabelById.get(row.to_id) || row.to_id;
  const score = Number(row.score || row.weight || 0).toFixed(2);
  return {
    id: `rel:${row.from_id}:${row.type}:${row.to_id}`,
    sourceType: "relationship",
    label: `${row.type}: ${fromLabel} -> ${toLabel}`,
    description: `Relationship score ${score}`,
    fromId: row.from_id,
    toId: row.to_id,
    relationType: row.type,
  };
}

export function buildSelectedDatapoints({ selectedNode, connectionData, nodeLabelById, maxItems = 12 }) {
  if (!selectedNode) return [];
  const tags = (selectedNode.tags || []).slice(0, 5).map((tag) => ({
    id: `tag:${tag}`,
    sourceType: "tag",
    label: `Tag: ${tag}`,
    description: `Metadata tag on ${selectedNode.label}`,
  }));

  const detailSnippets = firstDetailSnippets(selectedNode.details, 3).map((snippet, index) => ({
    id: `detail:${index}`,
    sourceType: "details",
    label: `Detail ${index + 1}`,
    description: snippet,
  }));

  const relations = (connectionData || []).slice(0, 8).map((row) => summarizeConnection(row, nodeLabelById));

  return [...tags, ...detailSnippets, ...relations].slice(0, maxItems);
}

function datapointColor(sourceType) {
  if (sourceType === "relationship") return "#38bdf8";
  if (sourceType === "details") return "#fb7185";
  return "#facc15";
}

export function buildForceGraphData({
  visibleNodes,
  treeEdges,
  connectionData,
  overlayEnabled,
  selectedNodeId = null,
  datapointsExpanded = false,
  datapointEntries = [],
}) {
  const nodeCount = visibleNodes.length;
  const nodes = visibleNodes.map(({ id, n, p }, index) => {
    const depthRadius = 100 + (p.depth || 0) * 70;
    const point = pointOnSphere(index, nodeCount, depthRadius);
    return {
      id,
      label: n.label,
      details: n.details || "",
      tags: n.tags || [],
      depth: p.depth || 0,
      color: id === "root" ? "#22c55e" : colorFromDepth(p.depth || 0),
      val: id === "root" ? 4.5 : 2.2,
      x: point.x,
      y: point.y,
      z: point.z,
    };
  });

  const treeLinks = treeEdges.map(([source, target]) => ({
    source,
    target,
    kind: "tree",
    color: "#9ca3af",
    width: 1.2,
  }));

  const overlayLinks = overlayEnabled
    ? connectionData.map((m) => ({
        source: m.from_id,
        target: m.to_id,
        kind: "overlay",
        type: m.type,
        color: m.type === "conflicts_with" ? "#ef4444" : "#6366f1",
        width: 1 + (m.score || 0) * 1.8,
        curvature: 0.14,
      }))
    : [];

  if (datapointsExpanded && selectedNodeId && datapointEntries.length) {
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (selectedNode) {
      const radius = 48;
      const datapointTotal = Math.min(datapointEntries.length, 14);
      for (let index = 0; index < datapointTotal; index += 1) {
        const dp = datapointEntries[index];
        const theta = (Math.PI * 2 * index) / Math.max(datapointTotal, 1);
        const phi = (Math.PI / 5) * ((index % 3) - 1);
        const id = `datapoint:${selectedNodeId}:${dp.id}`;
        const x = selectedNode.x + Math.cos(theta) * Math.cos(phi) * radius;
        const y = selectedNode.y + Math.sin(phi) * radius;
        const z = selectedNode.z + Math.sin(theta) * Math.cos(phi) * radius;

        nodes.push({
          id,
          label: dp.label,
          details: dp.description || "",
          tags: [dp.sourceType],
          depth: selectedNode.depth + 1,
          color: datapointColor(dp.sourceType),
          val: 1.1,
          x,
          y,
          z,
          isDatapoint: true,
          datapointId: dp.id,
          datapointLabel: dp.label,
        });

        treeLinks.push({
          source: selectedNodeId,
          target: id,
          kind: "datapoint",
          color: "#94a3b8",
          width: 0.8,
          curvature: 0.22,
        });
      }
    }
  }

  return {
    nodes,
    links: [...treeLinks, ...overlayLinks],
  };
}
