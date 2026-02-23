import { HelixGraphStore } from "./helixGraphStore.js";
import { InMemoryGraphStore } from "./inMemoryGraphStore.js";

export function createGraphStore() {
  const url = process.env.HELIXDB_URL || "";
  const apiKey = process.env.HELIXDB_API_KEY || null;
  const enabled = process.env.HELIXDB_ENABLED === "true";
  if (enabled && url) {
    return new HelixGraphStore({ url, enabled: true, apiKey });
  }
  return new InMemoryGraphStore();
}
