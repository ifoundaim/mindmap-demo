import { HelixGraphStore } from "./helixGraphStore.js";
import { InMemoryGraphStore } from "./inMemoryGraphStore.js";
import { JsonFileGraphStore } from "./jsonFileGraphStore.js";

export function createGraphStore() {
  const url = process.env.HELIXDB_URL || "";
  const apiKey = process.env.HELIXDB_API_KEY || null;
  const enabled = process.env.HELIXDB_ENABLED === "true";
  if (enabled && url) {
    return new HelixGraphStore({ url, enabled: true, apiKey });
  }
  const dataPath = process.env.GRAPH_DATA_PATH || "";
  if (dataPath) {
    return new JsonFileGraphStore(dataPath);
  }
  return new InMemoryGraphStore();
}
