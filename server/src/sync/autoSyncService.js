import os from "node:os";
import path from "node:path";
import { promises as fs } from "node:fs";

function safeJsonParse(line) {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

function normalizeUserText(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/<user_query>([\s\S]*?)<\/user_query>/i);
  if (match?.[1]) return match[1].trim();
  return raw;
}

function collectMessageText(entry) {
  const content = entry?.message?.content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((part) => part?.type === "text" && typeof part?.text === "string")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function buildCursorChatImportRows(lines, { baseTurnIndex = 0 } = {}) {
  const chats = [];
  for (let i = 0; i < lines.length; i += 1) {
    const parsed = safeJsonParse(lines[i]);
    if (!parsed || parsed.role !== "user") continue;
    const text = normalizeUserText(collectMessageText(parsed));
    if (!text) continue;
    chats.push({
      turn_key: `line-${baseTurnIndex + i}`,
      turn_index: baseTurnIndex + i,
      message: text.slice(0, 1200),
      raw_excerpt: text,
      tags: ["cursor", "auto_sync"],
      related_node_ids: [],
    });
  }
  return chats;
}

async function walkJsonlFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    let entries = [];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "subagents") continue;
        await walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        out.push(fullPath);
      }
    }
  }
  await walk(rootDir);
  return out.sort((a, b) => a.localeCompare(b));
}

function inferCursorTranscriptsDir(cwd) {
  const encoded = String(cwd || process.cwd())
    .replaceAll("/", "-")
    .replace(/^-+/, "");
  return path.join(os.homedir(), ".cursor", "projects", encoded, "agent-transcripts");
}

async function readSyncState(statePath) {
  try {
    const raw = await fs.readFile(statePath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      cursor_file_offsets: parsed.cursor_file_offsets || {},
      last_run_at: parsed.last_run_at || null,
    };
  } catch {
    return {
      cursor_file_offsets: {},
      last_run_at: null,
    };
  }
}

async function writeSyncState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export class AutoSyncService {
  constructor(service, options = {}) {
    this.service = service;
    this.options = {
      enabled: options.enabled !== false,
      interval_ms: options.interval_ms || 5 * 60 * 1000,
      sync_git: options.sync_git !== false,
      sync_cursor: options.sync_cursor !== false,
      git_repo_path: options.git_repo_path || process.cwd(),
      git_branch: options.git_branch || "",
      git_limit: Number(options.git_limit || 25),
      cursor_transcripts_dir:
        options.cursor_transcripts_dir || inferCursorTranscriptsDir(process.cwd()),
      state_path:
        options.state_path || path.join(process.cwd(), ".mindmap", "auto-sync-state.json"),
    };
    this.timer = null;
    this.running = false;
    this.status = {
      enabled: this.options.enabled,
      running: false,
      last_run_at: null,
      last_error: "",
      last_result: "idle",
      git: { imported: 0, skipped_duplicates: 0, total: 0 },
      cursor: { imported: 0, skipped_duplicates: 0, total: 0, files_scanned: 0 },
      diagnostics: {
        git: { available: true, error: "" },
        cursor: { available: true, error: "" },
      },
      paths: {
        git_repo_path: this.options.git_repo_path,
        cursor_transcripts_dir: this.options.cursor_transcripts_dir,
        state_path: this.options.state_path,
      },
    };
  }

  getStatus() {
    return { ...this.status };
  }

  async runOnce(trigger = "manual") {
    if (!this.options.enabled || this.running) return this.getStatus();
    this.running = true;
    this.status.running = true;
    this.status.last_error = "";
    this.status.last_result = "running";
    this.status.last_trigger = trigger;
    const state = await readSyncState(this.options.state_path);

    try {
      this.status.diagnostics = {
        git: { available: true, error: "" },
        cursor: { available: true, error: "" },
      };
      const errors = [];
      let importedSources = 0;

      if (this.options.sync_git) {
        const gitRepoPath = this.options.git_repo_path || process.cwd();
        const gitMarkerPath = path.join(gitRepoPath, ".git");
        const repoExists = await pathExists(gitRepoPath);
        const hasGitMarker = await pathExists(gitMarkerPath);
        if (!repoExists || !hasGitMarker) {
          this.status.diagnostics.git = {
            available: false,
            error: `Git repo path is not valid: ${gitRepoPath}`,
          };
          errors.push(`git unavailable (${gitRepoPath})`);
        } else {
          try {
            const git = await this.service.importGitHistory({
              conversation_key: "auto-sync-git",
              repository: path.basename(this.options.git_repo_path || process.cwd()),
              repo_path: this.options.git_repo_path,
              branch: this.options.git_branch || undefined,
              limit: this.options.git_limit,
            });
            this.status.git = {
              imported: git.imported || 0,
              skipped_duplicates: git.skipped_duplicates || 0,
              total: git.total || 0,
            };
            importedSources += 1;
          } catch (error) {
            this.status.diagnostics.git = {
              available: false,
              error: error?.message || "Git sync failed.",
            };
            errors.push("git sync failed");
          }
        }
      }

      if (this.options.sync_cursor) {
        const transcriptDir = this.options.cursor_transcripts_dir;
        const transcriptExists = await pathExists(transcriptDir);
        if (!transcriptExists) {
          this.status.diagnostics.cursor = {
            available: false,
            error: `Cursor transcripts path not found: ${transcriptDir}`,
          };
          errors.push(`cursor unavailable (${transcriptDir})`);
        } else {
          try {
            const files = await walkJsonlFiles(transcriptDir);
            let imported = 0;
            let skipped = 0;
            let total = 0;
            for (const transcriptPath of files) {
              const fileRaw = await fs.readFile(transcriptPath, "utf8").catch(() => "");
              const lines = fileRaw
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean);
              const previousOffset = Number(state.cursor_file_offsets[transcriptPath] || 0);
              const nextLines = lines.slice(previousOffset);
              const chats = buildCursorChatImportRows(nextLines, { baseTurnIndex: previousOffset });
              if (chats.length) {
                const conversationId = path.basename(path.dirname(transcriptPath));
                const result = await this.service.importCursorChats({
                  conversation_key: `auto-sync-cursor:${conversationId}`,
                  workspace: process.cwd(),
                  chats,
                });
                imported += result.imported || 0;
                skipped += result.skipped_duplicates || 0;
                total += result.total || 0;
              }
              state.cursor_file_offsets[transcriptPath] = lines.length;
            }
            this.status.cursor = {
              imported,
              skipped_duplicates: skipped,
              total,
              files_scanned: files.length,
            };
            importedSources += 1;
          } catch (error) {
            this.status.diagnostics.cursor = {
              available: false,
              error: error?.message || "Cursor sync failed.",
            };
            errors.push("cursor sync failed");
          }
        }
      }

      state.last_run_at = new Date().toISOString();
      await writeSyncState(this.options.state_path, state);
      this.status.last_run_at = state.last_run_at;
      if (errors.length) {
        this.status.last_error = errors.join("; ");
      }
      if (!importedSources && errors.length) {
        this.status.last_result = "failed";
      } else if (importedSources > 0 && errors.length) {
        this.status.last_result = "partial";
      } else {
        this.status.last_result = "success";
      }
    } catch (error) {
      this.status.last_error = error?.message || "Auto-sync run failed.";
      this.status.last_result = "failed";
    } finally {
      this.running = false;
      this.status.running = false;
    }
    return this.getStatus();
  }

  async start() {
    if (!this.options.enabled) return;
    await this.runOnce("startup");
    this.timer = setInterval(() => {
      this.runOnce("interval");
    }, this.options.interval_ms);
    if (typeof this.timer.unref === "function") this.timer.unref();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

export const __testables = {
  buildCursorChatImportRows,
  inferCursorTranscriptsDir,
  pathExists,
};
