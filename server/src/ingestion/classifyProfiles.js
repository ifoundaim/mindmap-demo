import { jaccardSimilarity, uniqueLower } from "../lib/text.js";
import { FIXED_CONTEXT_PROFILE_IDS } from "../domain/constants.js";

const BUSINESS_HINTS = [
  "startup",
  "funding",
  "investor",
  "pitch",
  "product",
  "market",
  "purposepath",
  "routeforge",
  "yc",
  "incubator",
  "accelerator",
];

const MUSIC_HINTS = [
  "music",
  "suno",
  "lyrics",
  "vocoder",
  "hyperpop",
  "artwork",
  "song",
  "audio",
  "mix",
  "vidu",
];

function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

function ruleScore(text, tags, nodeIds, hints) {
  let score = 0;
  for (const h of hints) {
    if (text.includes(h)) score += 0.08;
    if (tags.includes(h)) score += 0.14;
    if (nodeIds.includes(h)) score += 0.14;
  }
  return clamp01(score);
}

function semanticScore(summary, profile) {
  const profileText = `${profile.label || ""} ${(profile.tags || []).join(" ")} ${(profile.node_ids || []).join(" ")}`;
  return jaccardSimilarity(summary, profileText);
}

function graphBoost(nodeIds, profile) {
  if (!nodeIds.length) return 0;
  const set = new Set(profile.node_ids || []);
  const overlap = nodeIds.filter((id) => set.has(id)).length;
  return clamp01(overlap * 0.2);
}

export async function classifyContextProfiles({
  summary,
  tags = [],
  relatedNodeIds = [],
  profiles = [],
}) {
  const normalizedSummary = String(summary || "").toLowerCase();
  const normalizedTags = uniqueLower(tags);
  const normalizedNodeIds = uniqueLower(relatedNodeIds);
  const activeProfiles = profiles.length
    ? profiles
    : FIXED_CONTEXT_PROFILE_IDS.map((id) => ({ profile_id: id, label: id, tags: [], node_ids: [] }));

  const profileScores = {};

  for (const profile of activeProfiles) {
    const id = profile.profile_id;
    if (id === "full_context") {
      profileScores[id] = 0.6;
      continue;
    }

    const hints = id.includes("music") ? MUSIC_HINTS : BUSINESS_HINTS;
    const rs = ruleScore(normalizedSummary, normalizedTags, normalizedNodeIds, hints);
    const ss = semanticScore(normalizedSummary, profile);
    const gb = graphBoost(normalizedNodeIds, profile);
    const score = clamp01(rs * 0.5 + ss * 0.3 + gb * 0.2);
    profileScores[id] = score;
  }

  // Ensure full_context remains available as fallback.
  if (profileScores.full_context === undefined) profileScores.full_context = 0.55;

  const ranked = Object.entries(profileScores).sort((a, b) => b[1] - a[1]);
  const bestScore = ranked[0]?.[1] ?? 0;
  const assignedProfiles = ranked
    .filter(([id, score]) => {
      if (id === "full_context") return false;
      return score >= 0.75 || (score >= 0.5 && bestScore - score <= 0.08);
    })
    .map(([id]) => id);

  const withFallback = assignedProfiles.length ? assignedProfiles : ["full_context"];
  return {
    assignedProfiles: withFallback,
    profileScores,
    classificationConfidence: bestScore,
    needsReview: bestScore < 0.55,
  };
}
