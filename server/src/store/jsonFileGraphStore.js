import { writeFileSync, readFileSync, existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname } from "node:path";
import { InMemoryGraphStore } from "./inMemoryGraphStore.js";

/**
 * Wraps InMemoryGraphStore with atomic JSON file persistence.
 * Debounces writes to avoid hammering disk on batch operations.
 */
export class JsonFileGraphStore extends InMemoryGraphStore {
  constructor(filePath) {
    super();
    this._filePath = filePath;
    this._saveTimer = null;
    this._saveDelay = 500; // ms

    const dir = dirname(filePath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    if (existsSync(filePath)) {
      try {
        this._load();
      } catch (err) {
        process.stderr.write(`[JsonFileGraphStore] Failed to load ${filePath}: ${err.message}\n`);
      }
    }
  }

  _load() {
    const raw = readFileSync(this._filePath, "utf8");
    const data = JSON.parse(raw);
    this.nodes = new Map(data.nodes || []);
    this.edges = new Map(data.edges || []);
    this.evidence = new Map(data.evidence || []);
    this.eventByHash = new Map(data.eventByHash || []);
    this.profiles = new Map(data.profiles || []);
    this.conversationProfiles = new Map(data.conversationProfiles || []);
    process.stderr.write(
      `[JsonFileGraphStore] Loaded ${this.nodes.size} nodes, ${this.evidence.size} evidence from ${this._filePath}\n`,
    );
  }

  _scheduleSave() {
    if (this._saveTimer) clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this._flush(), this._saveDelay);
  }

  _flush() {
    const tmp = this._filePath + ".tmp";
    const data = JSON.stringify({
      nodes: Array.from(this.nodes.entries()),
      edges: Array.from(this.edges.entries()),
      evidence: Array.from(this.evidence.entries()),
      eventByHash: Array.from(this.eventByHash.entries()),
      profiles: Array.from(this.profiles.entries()),
      conversationProfiles: Array.from(this.conversationProfiles.entries()),
    });
    writeFileSync(tmp, data, "utf8");
    renameSync(tmp, this._filePath); // atomic on POSIX
  }

  upsertNode(node) {
    const result = super.upsertNode(node);
    this._scheduleSave();
    return result;
  }

  upsertEdge(edge) {
    const result = super.upsertEdge(edge);
    this._scheduleSave();
    return result;
  }

  insertEvidence(event) {
    const result = super.insertEvidence(event);
    if (!result.duplicate) this._scheduleSave();
    return result;
  }

  setProfile(profileId, profileData) {
    const result = super.setProfile(profileId, profileData);
    this._scheduleSave();
    return result;
  }

  setConversationProfile(conversationKey, profileId) {
    const result = super.setConversationProfile(conversationKey, profileId);
    this._scheduleSave();
    return result;
  }
}
