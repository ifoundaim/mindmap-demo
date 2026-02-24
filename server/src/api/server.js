import "dotenv/config";
import { createGraphStore } from "../store/createGraphStore.js";
import { MindMapService } from "../services/mindmapService.js";
import { createApp } from "./createApp.js";
import { AutoSyncService } from "../sync/autoSyncService.js";

const port = Number(process.env.MINDMAP_API_PORT || 8787);
const store = createGraphStore();
const service = new MindMapService(store);
const autoSync = new AutoSyncService(service, {
  enabled: process.env.MINDMAP_AUTO_SYNC_ENABLED === "true",
  interval_ms: Number(process.env.MINDMAP_AUTO_SYNC_INTERVAL_MS || 5 * 60 * 1000),
  sync_git: process.env.MINDMAP_AUTO_SYNC_GIT !== "false",
  sync_cursor: process.env.MINDMAP_AUTO_SYNC_CURSOR !== "false",
  git_repo_path: process.env.MINDMAP_AUTO_SYNC_GIT_REPO_PATH || process.cwd(),
  git_branch: process.env.MINDMAP_AUTO_SYNC_GIT_BRANCH || "",
  git_limit: Number(process.env.MINDMAP_AUTO_SYNC_GIT_LIMIT || 25),
  cursor_transcripts_dir: process.env.MINDMAP_AUTO_SYNC_CURSOR_DIR || undefined,
  state_path: process.env.MINDMAP_AUTO_SYNC_STATE_PATH || undefined,
});
const app = createApp(service);
app.locals.autoSync = autoSync;

app.listen(port, () => {
  console.log(`MindMap API listening on http://localhost:${port}`);
});

autoSync.start();
