/* @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./components/MindMap3DView", () => ({
  default: function MockMindMap3DView({ graphData, onSelectNode, onToggleCollapse }) {
    return (
      <div data-testid="mock-3d-view">
        <button onClick={() => onToggleCollapse("core-arc")}>Toggle core arc</button>
        {graphData.nodes.map((node) => (
          <button key={node.id} onClick={() => onSelectNode(node.id)}>
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
