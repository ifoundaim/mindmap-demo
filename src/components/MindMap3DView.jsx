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
  selectedHudData,
  datapointsExpanded,
  onExpandDatapoints,
  onHideDatapoints,
  onFocusSelected,
  onSelectDatapoint,
  activeDatapointId,
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
          if (node.isDatapoint && node.datapointId === activeDatapointId) return "#f8fafc";
          if (node.isDatapoint) return node.color || "#38bdf8";
          if (node.id === selectedId) return "#22c55e";
          if (selectedPath.has(node.id)) return "#f59e0b";
          return node.color;
        }}
        nodeVal={(node) => node.val}
        linkColor={(link) => link.color || "#9ca3af"}
        linkWidth={(link) => link.width || 1}
        linkCurvature={(link) => link.curvature || 0}
        onNodeClick={(node) => {
          if (node.isDatapoint) {
            onSelectDatapoint(node.datapointId || null);
            return;
          }
          const now = Date.now();
          const isDouble = clickRef.current.id === node.id && now - clickRef.current.at < 280;
          clickRef.current = { id: node.id, at: now };
          onSelectNode(node.id);
          if (isDouble) onToggleCollapse(node.id);
        }}
        onBackgroundClick={() => onSelectDatapoint(null)}
      />
      {selectedHudData ? (
        <div
          className="absolute left-3 top-14 z-20 w-[380px] rounded-md border bg-white/95 p-3 text-xs shadow"
          data-testid="mindmap-3d-hud"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">3D HUD</div>
              <div className="text-sm font-semibold text-neutral-900">{selectedHudData.title}</div>
              <div className="text-[11px] text-neutral-500">Depth: {selectedHudData.depth}</div>
            </div>
            <div className="flex items-center gap-1">
              {datapointsExpanded ? (
                <button
                  onClick={onHideDatapoints}
                  className="rounded border px-2 py-1 text-[11px] hover:bg-neutral-100"
                >
                  Hide datapoints
                </button>
              ) : (
                <button
                  onClick={onExpandDatapoints}
                  className="rounded border px-2 py-1 text-[11px] hover:bg-neutral-100"
                >
                  Expand datapoints
                </button>
              )}
              <button
                onClick={onFocusSelected}
                className="rounded border px-2 py-1 text-[11px] hover:bg-neutral-100"
              >
                Focus camera
              </button>
            </div>
          </div>

          <div className="mt-2 text-neutral-700">{selectedHudData.details || "No details yet."}</div>

          <div className="mt-2 flex flex-wrap gap-1">
            {(selectedHudData.tags || []).slice(0, 6).map((tag) => (
              <span key={tag} className="rounded border px-1.5 py-[2px] text-[10px] text-neutral-600">
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-2">
            <div className="text-[11px] font-semibold text-neutral-700">Relationships</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {(selectedHudData.relationships || []).slice(0, 4).map((rel) => (
                <span key={rel.id} className="rounded border px-1.5 py-[2px] text-[10px] text-neutral-600">
                  {rel.label}
                </span>
              ))}
              {!selectedHudData.relationships?.length ? (
                <span className="text-[10px] text-neutral-500">No relationship overlay items.</span>
              ) : null}
            </div>
          </div>

          <div className="mt-2 rounded border p-2">
            <div className="text-[11px] font-semibold text-neutral-700">Datapoint focus</div>
            {selectedHudData.activeDatapoint ? (
              <div className="mt-1">
                <div className="text-[11px] font-medium text-neutral-800">
                  {selectedHudData.activeDatapoint.label}
                </div>
                <div className="text-[11px] text-neutral-600">
                  {selectedHudData.activeDatapoint.description}
                </div>
              </div>
            ) : (
              <div className="mt-1 text-[11px] text-neutral-500">
                Expand datapoints, then click a mini node to inspect.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
