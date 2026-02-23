/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./components/MindMap3DView", () => ({
  default: function MockMindMap3DView({
    graphData,
    onSelectNode,
    onToggleCollapse,
    selectedHudData,
    datapointsExpanded,
    onExpandDatapoints,
    onHideDatapoints,
    onFocusSelected,
    onSelectDatapoint,
  }) {
    const datapoints = graphData.nodes.filter((n) => n.isDatapoint);
    return (
      <div data-testid="mock-3d-view">
        <div data-testid="datapoint-count">{datapoints.length}</div>
        {selectedHudData ? (
          <div data-testid="hud-title">
            {selectedHudData.title}
            {selectedHudData.activeDatapoint ? ` :: ${selectedHudData.activeDatapoint.label}` : ""}
          </div>
        ) : null}
        <button onClick={onFocusSelected}>Focus camera</button>
        {datapointsExpanded ? (
          <button onClick={onHideDatapoints}>Hide datapoints</button>
        ) : (
          <button onClick={onExpandDatapoints}>Expand datapoints</button>
        )}
        <button
          onClick={() => {
            if (datapoints[0]) onSelectDatapoint(datapoints[0].datapointId);
          }}
        >
          Pick first datapoint
        </button>
        <button onClick={() => onToggleCollapse("core-arc")}>Toggle core arc</button>
        {graphData.nodes.map((node) => (
          <button
            key={node.id}
            onClick={() => {
              if (node.isDatapoint) onSelectDatapoint(node.datapointId);
              else onSelectNode(node.id);
            }}
          >
            {node.label}
          </button>
        ))}
      </div>
    );
  },
}));

import MindMapExplorer from "./MindMapExplorer";

function createJsonResponse(payload, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  global.fetch = vi.fn(async (input) => {
    const url = String(input || "");
    if (url.includes("/api/graph/insights")) {
      return createJsonResponse({ top_bridges: [], contradictions: [], timeline: [] });
    }
    if (url.includes("/api/mcp/recommend-next-actions")) {
      return createJsonResponse({ actions: [] });
    }
    if (url.includes("/api/mcp/list-context-profiles")) {
      return createJsonResponse({ profiles: [] });
    }
    if (url.includes("/api/graph/connections")) {
      return createJsonResponse({ matches: [] });
    }
    if (url.includes("/api/mcp/recall-context")) {
      return createJsonResponse({ memories: [], contradictions: [] });
    }
    return createJsonResponse({}, false);
  });
});

afterEach(() => {
  cleanup();
});

describe("MindMapExplorer 2D/3D regressions", () => {
  function mapSearchInput() {
    return screen.getAllByPlaceholderText(/try: supabase/i)[0];
  }

  it("updates selected node in 2D and 3D modes", async () => {
    render(<MindMapExplorer />);

    fireEvent.change(mapSearchInput(), {
      target: { value: "startups" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Startups & ventures/i }));
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getAllByText("Startups & ventures").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");
    fireEvent.click(screen.getByRole("button", { name: "Engineering & tooling" }));

    expect(screen.getAllByText("Engineering & tooling").length).toBeGreaterThan(0);
  });

  it("preserves selected node and active query across mode toggles", async () => {
    render(<MindMapExplorer />);

    fireEvent.change(mapSearchInput(), {
      target: { value: "core" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Core arc/i }));

    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");
    fireEvent.click(screen.getByTestId("toggle-2d"));

    expect(screen.getAllByText("Core arc").length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue("core")).toBeInTheDocument();
  });

  it("changes visible node count on collapse in 2D and 3D", async () => {
    render(<MindMapExplorer />);

    const countText = () => screen.getByText(/Nodes:/i).textContent || "";
    const extractCount = () => Number.parseInt(countText().match(/Nodes:\s*(\d+)/i)?.[1] || "0", 10);

    fireEvent.change(mapSearchInput(), {
      target: { value: "core" },
    });
    fireEvent.click(await screen.findByRole("button", { name: /Core arc/i }));

    const before = extractCount();
    fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    await waitFor(() => expect(extractCount()).toBeLessThan(before));

    const collapsedCount = extractCount();
    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");
    fireEvent.click(screen.getByRole("button", { name: "Toggle core arc" }));

    await waitFor(() => expect(extractCount()).toBeGreaterThan(collapsedCount));
  });

  it("shows 3D HUD and keeps right panel synced", async () => {
    render(<MindMapExplorer />);
    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");

    fireEvent.click(screen.getByRole("button", { name: "Core arc" }));
    expect(screen.getByTestId("hud-title")).toHaveTextContent("Core arc");
    expect(screen.getAllByText("Core arc").length).toBeGreaterThan(0);
  });

  it("expands and hides datapoint mini nodes from HUD controls", async () => {
    render(<MindMapExplorer />);
    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");
    fireEvent.click(screen.getByRole("button", { name: "Core arc" }));

    expect(screen.getByTestId("datapoint-count")).toHaveTextContent("0");
    fireEvent.click(screen.getByRole("button", { name: "Expand datapoints" }));
    await waitFor(() =>
      expect(Number(screen.getByTestId("datapoint-count").textContent || "0")).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide datapoints" }));
    await waitFor(() => expect(screen.getByTestId("datapoint-count")).toHaveTextContent("0"));
  });

  it("updates HUD datapoint focus without changing right-panel parent selection", async () => {
    render(<MindMapExplorer />);
    fireEvent.click(screen.getByTestId("toggle-3d"));
    await screen.findByTestId("mock-3d-view");
    fireEvent.click(screen.getByRole("button", { name: "Core arc" }));
    fireEvent.click(screen.getByRole("button", { name: "Expand datapoints" }));

    await waitFor(() =>
      expect(Number(screen.getByTestId("datapoint-count").textContent || "0")).toBeGreaterThan(0),
    );
    fireEvent.click(screen.getByRole("button", { name: "Pick first datapoint" }));

    expect(screen.getByTestId("hud-title").textContent || "").toContain("::");
    expect(screen.getAllByText("Core arc").length).toBeGreaterThan(0);
  });

  it("posts to git import endpoint from auto import panel", async () => {
    render(<MindMapExplorer />);
    fireEvent.click(await screen.findByRole("button", { name: /Import git commits/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/import/git-history"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  it("posts to cursor import endpoint from auto import panel", async () => {
    render(<MindMapExplorer />);
    fireEvent.change(
      await screen.findByPlaceholderText(/Paste Cursor chat lines \(one per line\)/i),
      {
        target: { value: "Add import context for recent chat findings" },
      },
    );
    fireEvent.click(await screen.findByRole("button", { name: /Import cursor notes/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/import/cursor-chats"),
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
