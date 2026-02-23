import { uniqueLower } from "../lib/text.js";

function slugify(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function words(input) {
  return String(input || "")
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'`/\\|+-]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function inferCapability({ summary, files = [], tags = [] }) {
  const lowerSummary = String(summary || "").toLowerCase();
  const lowerFiles = (files || []).map((f) => String(f || "").toLowerCase());
  const lowerTags = (tags || []).map((t) => String(t || "").toLowerCase());
  const labels = new Set();
  let confidence = 0.35;
  const reasons = [];

  const includeLabel = (label, why, boost = 0.1) => {
    labels.add(label);
    reasons.push(why);
    confidence = Math.min(1, confidence + boost);
  };

  if (/\bfix|bug|regression|issue|patch\b/.test(lowerSummary)) {
    includeLabel("bugfix", "commit text references fix/regression", 0.2);
  }
  if (/\bfeat|feature|add(ed)?|implement(ed)?\b/.test(lowerSummary)) {
    includeLabel("feature", "commit text references feature delivery", 0.2);
  }
  if (/\brefactor|cleanup|restructure\b/.test(lowerSummary)) {
    includeLabel("refactor", "commit text references refactor", 0.15);
  }
  if (/\btest|vitest|regression test|integration test\b/.test(lowerSummary)) {
    includeLabel("testing", "summary references tests", 0.2);
  }
  if (/\bdocs|readme|changelog|commit_log\b/.test(lowerSummary)) {
    includeLabel("documentation", "summary references docs", 0.15);
  }
  if (/\bapi|endpoint|route|server\b/.test(lowerSummary) || lowerFiles.some((f) => f.includes("/server/"))) {
    includeLabel("backend", "server/api files were touched", 0.15);
  }
  if (
    /\breact|ui|frontend|component|view\b/.test(lowerSummary) ||
    lowerFiles.some((f) => f.includes("/src/") && !f.includes("/server/"))
  ) {
    includeLabel("frontend", "frontend component files were touched", 0.15);
  }
  if (lowerTags.some((t) => ["startup", "business", "funding"].includes(t))) {
    includeLabel("business", "tags imply business context", 0.1);
  }
  if (lowerTags.some((t) => ["music", "audio", "suno"].includes(t))) {
    includeLabel("music", "tags imply music context", 0.1);
  }

  if (!labels.size) {
    labels.add("general_context");
    reasons.push("no strong capability signal found");
    confidence = Math.min(confidence, 0.45);
  }

  return {
    labels: Array.from(labels),
    confidence: Number(confidence.toFixed(2)),
    reason: reasons.slice(0, 3).join("; "),
  };
}

function deriveTagsFromFiles(files = []) {
  const tags = [];
  for (const file of files) {
    const parts = String(file || "")
      .split("/")
      .map((x) => x.trim())
      .filter(Boolean);
    if (!parts.length) continue;
    tags.push(parts[0]);
    if (parts[1]) tags.push(parts[1]);
    const stem = parts[parts.length - 1]?.replace(/\.[a-z0-9]+$/i, "");
    if (stem) tags.push(stem);
  }
  return uniqueLower(tags);
}

function deriveRelatedNodes({ text = "", tags = [], files = [], knownNodeIds = [] }) {
  const corpus = `${text} ${(tags || []).join(" ")} ${(files || []).join(" ")}`.toLowerCase();
  const picked = (knownNodeIds || []).filter((id) => {
    const norm = String(id || "").toLowerCase();
    if (!norm) return false;
    return corpus.includes(norm) || corpus.includes(norm.replace(/[-_]/g, " "));
  });
  return uniqueLower(picked);
}

export function normalizeCursorChatEvents(payload, knownNodeIds = []) {
  const conversationKey = payload.conversation_key;
  const workspace = payload.workspace || "";
  return (payload.chats || []).map((chat, index) => {
    const chatId = chat.chat_id || `chat-${index + 1}`;
    const turnKey = chat.turn_key || `${chatId}::${chat.turn_index ?? index}`;
    const rawExcerpt = chat.raw_excerpt || chat.message;
    const summary = chat.message.trim();
    const autoTags = uniqueLower([
      "cursor",
      "chat",
      ...(chat.tags || []),
      ...(chat.title ? words(chat.title).slice(0, 3) : []),
    ]);
    const relatedNodeIds = uniqueLower([
      ...(chat.related_node_ids || []),
      ...deriveRelatedNodes({
        text: summary,
        tags: autoTags,
        knownNodeIds,
      }),
    ]);
    const capability = inferCapability({ summary, tags: autoTags });
    return {
      conversation_key: conversationKey,
      turn_key: turnKey,
      summary,
      raw_excerpt: rawExcerpt,
      source: "cursor_chat",
      tags: autoTags,
      related_node_ids: relatedNodeIds,
      timestamp: chat.timestamp,
      needs_review: capability.confidence < 0.55,
      capability,
      import_metadata: {
        kind: "cursor_chat",
        workspace,
        chat_title: chat.title || "",
        transcript_turn_index: Number.isFinite(chat.turn_index) ? chat.turn_index : index,
      },
    };
  });
}

export function normalizeGitCommitEvents(payload, commits = [], knownNodeIds = []) {
  const conversationKey = payload.conversation_key || "git-history";
  const repository = payload.repository || "";
  const repoPath = payload.repo_path || "";
  const branch = payload.branch || "";
  return (commits || []).map((commit, index) => {
    const files = commit.files || [];
    const summary = commit.subject || "";
    const body = commit.body || "";
    const fileTags = deriveTagsFromFiles(files);
    const autoTags = uniqueLower(["git", "commit", ...fileTags, ...words(summary).slice(0, 5)]);
    const relatedNodeIds = deriveRelatedNodes({
      text: `${summary} ${body}`,
      tags: autoTags,
      files,
      knownNodeIds,
    });
    const capability = inferCapability({ summary: `${summary} ${body}`, files, tags: autoTags });
    return {
      conversation_key: conversationKey,
      turn_key: commit.hash || `git-${index}`,
      summary,
      raw_excerpt: [summary, body, files.length ? `files: ${files.join(", ")}` : ""].filter(Boolean).join("\n"),
      source: "git_commit",
      tags: autoTags,
      related_node_ids: relatedNodeIds,
      timestamp: commit.date,
      needs_review: capability.confidence < 0.55,
      capability,
      import_metadata: {
        kind: "git_commit",
        repository,
        repo_path: repoPath,
        branch,
        commit_hash: commit.hash,
        author: commit.author || "",
        files_touched: files,
      },
      event_id: slugify(`${conversationKey}-${commit.hash || index}`),
    };
  });
}
