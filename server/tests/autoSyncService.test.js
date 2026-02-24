import { describe, it, expect } from "vitest";
import path from "node:path";
import os from "node:os";
import { promises as fs } from "node:fs";
import { AutoSyncService, __testables } from "../src/sync/autoSyncService.js";

describe("auto sync service", () => {
  it("extracts user query text from transcript lines", () => {
    const lines = [
      JSON.stringify({
        role: "user",
        message: {
          content: [
            {
              type: "text",
              text: "<user_query>\nSync this context\n</user_query>",
            },
          ],
        },
      }),
      JSON.stringify({
        role: "assistant",
        message: {
          content: [{ type: "text", text: "ignored" }],
        },
      }),
    ];
    const rows = __testables.buildCursorChatImportRows(lines);
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toBe("Sync this context");
  });

  it("runs git and cursor sync and writes checkpoint state", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mindmap-autosync-"));
    const transcriptRoot = path.join(tempRoot, "agent-transcripts", "conv-1");
    await fs.mkdir(transcriptRoot, { recursive: true });
    const transcriptPath = path.join(transcriptRoot, "conv-1.jsonl");
    await fs.writeFile(
      transcriptPath,
      `${JSON.stringify({
        role: "user",
        message: {
          content: [{ type: "text", text: "<user_query>\nAuto sync row\n</user_query>" }],
        },
      })}\n`,
    );

    const calls = {
      git: 0,
      cursor: 0,
    };
    const fakeService = {
      async importGitHistory() {
        calls.git += 1;
        return { imported: 1, skipped_duplicates: 0, total: 1 };
      },
      async importCursorChats(payload) {
        calls.cursor += 1;
        expect(payload.chats.length).toBe(1);
        return { imported: 1, skipped_duplicates: 0, total: 1 };
      },
    };

    const statePath = path.join(tempRoot, "state.json");
    await fs.mkdir(path.join(tempRoot, ".git"), { recursive: true });
    const sync = new AutoSyncService(fakeService, {
      enabled: true,
      interval_ms: 999999,
      sync_git: true,
      sync_cursor: true,
      git_repo_path: tempRoot,
      cursor_transcripts_dir: path.join(tempRoot, "agent-transcripts"),
      state_path: statePath,
    });
    const status = await sync.runOnce("test");
    expect(calls.git).toBe(1);
    expect(calls.cursor).toBe(1);
    expect(status.git.imported).toBe(1);
    expect(status.cursor.imported).toBe(1);

    const rawState = await fs.readFile(statePath, "utf8");
    const parsedState = JSON.parse(rawState);
    expect(parsedState.cursor_file_offsets[transcriptPath]).toBe(1);
  });

  it("reports partial success when cursor path is missing but git succeeds", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mindmap-autosync-partial-"));
    const fakeService = {
      async importGitHistory() {
        return { imported: 1, skipped_duplicates: 0, total: 1 };
      },
      async importCursorChats() {
        return { imported: 0, skipped_duplicates: 0, total: 0 };
      },
    };
    const sync = new AutoSyncService(fakeService, {
      enabled: true,
      sync_git: true,
      sync_cursor: true,
      git_repo_path: tempRoot,
      cursor_transcripts_dir: path.join(tempRoot, "missing-transcripts-dir"),
      state_path: path.join(tempRoot, "state.json"),
    });
    await fs.mkdir(path.join(tempRoot, ".git"), { recursive: true });
    const status = await sync.runOnce("test");
    expect(status.last_result).toBe("partial");
    expect(status.diagnostics.cursor.available).toBe(false);
    expect(status.git.imported).toBe(1);
  });

  it("reports failure when both git and cursor defaults are unavailable", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mindmap-autosync-fail-"));
    const fakeService = {
      async importGitHistory() {
        return { imported: 0, skipped_duplicates: 0, total: 0 };
      },
      async importCursorChats() {
        return { imported: 0, skipped_duplicates: 0, total: 0 };
      },
    };
    const sync = new AutoSyncService(fakeService, {
      enabled: true,
      sync_git: true,
      sync_cursor: true,
      git_repo_path: path.join(tempRoot, "not-a-repo"),
      cursor_transcripts_dir: path.join(tempRoot, "missing-transcripts"),
      state_path: path.join(tempRoot, "state.json"),
    });
    const status = await sync.runOnce("test");
    expect(status.last_result).toBe("failed");
    expect(status.last_error).toContain("git unavailable");
    expect(status.last_error).toContain("cursor unavailable");
  });
});
