import React from "react";

export default function MindMap2DView({
  svgRef,
  tx,
  ty,
  scale,
  edges,
  overlayEdges,
  visibleNodes,
  collapsed,
  nodeW,
  nodeH,
  nodeStyle,
  onSelectNode,
  onToggleCollapse,
}) {
  return (
    <svg ref={svgRef} className="h-full w-full cursor-grab bg-neutral-50">
      <g transform={`translate(${tx}, ${ty}) scale(${scale})`}>
        {edges.map((e) => (
          <path
            key={`${e.a}->${e.b}`}
            d={e.d}
            fill="none"
            stroke="#9ca3af"
            strokeWidth={1.2}
          />
        ))}

        {overlayEdges.map((e) => (
          <line
            key={e.id}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={e.type === "conflicts_with" ? "#ef4444" : "#6366f1"}
            strokeWidth={1 + e.score * 2}
            strokeDasharray={e.type === "depends_on" ? "6 3" : "3 3"}
            opacity={0.85}
          />
        ))}

        {visibleNodes.map(({ id, n, p }) => {
          const isCollapsed = collapsed.get(id) === true;
          const kids = (n.children || []).length;
          const style = nodeStyle(id, n);
          return (
            <g
              key={id}
              transform={`translate(${p.x}, ${p.y})`}
              onClick={(ev) => {
                ev.stopPropagation();
                onSelectNode(id);
              }}
              onDoubleClick={(ev) => {
                ev.stopPropagation();
                if (kids > 0) onToggleCollapse(id);
              }}
              style={{ cursor: "pointer" }}
            >
              <rect x={0} y={0} rx={10} ry={10} width={nodeW} height={nodeH} {...style} />
              <text x={12} y={18} fontSize={12} fontWeight={600} fill="#111827">
                {n.label.length > 26 ? `${n.label.slice(0, 26)}…` : n.label}
              </text>
              <text x={12} y={34} fontSize={10} fill="#6b7280">
                {(n.tags || []).slice(0, 3).join(" · ")}
                {(n.tags || []).length > 3 ? " …" : ""}
              </text>

              {kids > 0 ? (
                <g transform={`translate(${nodeW - 20}, ${nodeH / 2})`}>
                  <circle
                    r={8}
                    fill={isCollapsed ? "#111827" : "white"}
                    stroke="#111827"
                    strokeWidth={1}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={10}
                    fontWeight={700}
                    fill={isCollapsed ? "white" : "#111827"}
                  >
                    {isCollapsed ? "+" : "−"}
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
