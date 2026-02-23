import React, { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";

function supportsWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(window.WebGLRenderingContext && canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function MindMap3DView({
  graphData,
  selectedId,
  selectedPathIds,
  onSelectNode,
  onToggleCollapse,
  focusNodeId,
}) {
  const fgRef = useRef(null);
  const clickRef = useRef({ id: null, at: 0 });
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    setWebglAvailable(supportsWebGL());
  }, []);

  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !focusNodeId) return;
    const node = graphData.nodes.find((n) => n.id === focusNodeId);
    if (!node) return;
    const distance = 200;
    const norm = Math.sqrt(node.x ** 2 + node.y ** 2 + node.z ** 2) || 1;
    const distRatio = 1 + distance / norm;
    fg.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio },
      node,
      900,
    );
  }, [focusNodeId, graphData]);

  const selectedPath = useMemo(() => new Set(selectedPathIds), [selectedPathIds]);

  if (!webglAvailable) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-neutral-50 text-sm text-neutral-600">
        3D view is unavailable in this browser. Switch back to 2D.
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-neutral-950" data-testid="mindmap-3d-view">
      <ForceGraph3D
        ref={fgRef}
        graphData={graphData}
        width={undefined}
        height={undefined}
        backgroundColor="#0a0a0a"
        warmupTicks={30}
        cooldownTicks={110}
        nodeRelSize={6}
        nodeLabel={(node) => {
          const tags = (node.tags || []).slice(0, 3).join(", ");
          return `${node.label}${tags ? `\n${tags}` : ""}`;
        }}
        nodeColor={(node) => {
          if (node.id === selectedId) return "#22c55e";
          if (selectedPath.has(node.id)) return "#f59e0b";
          return node.color;
        }}
        nodeVal={(node) => node.val}
        linkColor={(link) => link.color || "#9ca3af"}
        linkWidth={(link) => link.width || 1}
        linkCurvature={(link) => link.curvature || 0}
        onNodeClick={(node) => {
          const now = Date.now();
          const isDouble = clickRef.current.id === node.id && now - clickRef.current.at < 280;
          clickRef.current = { id: node.id, at: now };
          onSelectNode(node.id);
          if (isDouble) onToggleCollapse(node.id);
        }}
      />
    </div>
  );
}
