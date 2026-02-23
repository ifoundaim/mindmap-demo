import "dotenv/config";
import { createGraphStore } from "../store/createGraphStore.js";
import { MindMapService } from "../services/mindmapService.js";
import { createApp } from "./createApp.js";

const port = Number(process.env.MINDMAP_API_PORT || 8787);
const store = createGraphStore();
const service = new MindMapService(store);
const app = createApp(service);

app.listen(port, () => {
  console.log(`MindMap API listening on http://localhost:${port}`);
});
