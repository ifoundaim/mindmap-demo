import { uniqueLower } from "../lib/text.js";

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "you",
  "our",
  "are",
  "was",
  "have",
  "has",
  "will",
  "about",
]);

function titleCase(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function extractCandidateNodes({ summary, tags = [], relatedNodeIds = [] }) {
  const words = summary
    .split(/[\s,.;:!?()[\]{}"'`/\\|+-]+/)
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x.length >= 4 && !STOPWORDS.has(x))
    .slice(0, 8);

  const derived = words.map((w) => ({
    id: w.replace(/\s+/g, "-"),
    label: titleCase(w),
    tags,
    category: "derived",
  }));

  const hinted = (relatedNodeIds || []).map((id) => ({
    id,
    label: titleCase(id.replace(/[-_]/g, " ")),
    tags,
    category: "hinted",
  }));

  const byId = new Map();
  for (const n of [...hinted, ...derived]) byId.set(n.id, n);
  return Array.from(byId.values());
}

export function mergeTags(...tagLists) {
  return uniqueLower(tagLists.flat());
}
