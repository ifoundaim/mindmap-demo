import "dotenv/config";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createGraphStore } from "../store/createGraphStore.js";
import { MindMapService } from "../services/mindmapService.js";
import { createMcpServer } from "./createMcpServer.js";

const store = createGraphStore();
const service = new MindMapService(store);
const server = createMcpServer(service);

const transport = new StdioServerTransport();
await server.connect(transport);
