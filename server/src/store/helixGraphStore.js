import { HelixDB } from "helix-ts";
import { InMemoryGraphStore } from "./inMemoryGraphStore.js";
import { HELIX_SCHEMA_QUERIES, HELIX_UNIQUENESS_CONSTRAINTS } from "../helix/queryRegistry.js";

/**
 * Helix adapter with in-memory shadow fallback.
 * If queries fail or Helix is unavailable, data remains available to the app.
 */
export class HelixGraphStore extends InMemoryGraphStore {
  constructor({ url, enabled, apiKey } = {}) {
    super();
    this.enabled = Boolean(enabled && url);
    this.url = url;
    this.apiKey = apiKey || null;
    this.constraints = HELIX_UNIQUENESS_CONSTRAINTS;
    this.endpoints = HELIX_SCHEMA_QUERIES.endpoints;
    this.client = this.enabled ? new HelixDB(url, this.apiKey) : null;
  }

  async runEndpoint(endpointName, variables) {
    if (!this.client || !this.enabled) return null;
    const endpoint = this.endpoints[endpointName];
    if (!endpoint) return null;
    try {
      return await this.client.query(endpoint, variables);
    } catch {
      return null;
    }
  }

  async upsertNode(node) {
    const result = super.upsertNode(node);
    await this.runEndpoint("createNode", result);
    return result;
  }

  async upsertEdge(edge) {
    const result = super.upsertEdge(edge);
    await this.runEndpoint("upsertEdge", result);
    return result;
  }

  async insertEvidence(event) {
    const result = super.insertEvidence(event);
    if (!result.duplicate) {
      await this.runEndpoint("upsertEvidence", event);
    }
    return result;
  }

  async queryConnections({ nodeId, limit, types }) {
    const response = await this.runEndpoint("findConnections", {
      node_id: nodeId,
      limit,
      types,
    });
    if (!response) return null;
    return response;
  }

  async queryRecommendations({ limit }) {
    const response = await this.runEndpoint("recommendNextActions", { limit });
    if (!response) return null;
    return response;
  }

  async queryInsights() {
    const response = await this.runEndpoint("graphInsights", {});
    if (!response) return null;
    return response;
  }
}
