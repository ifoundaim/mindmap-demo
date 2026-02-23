import { normalizeText, jaccardSimilarity } from "../lib/text.js";
import { sha256 } from "../lib/hash.js";

export function makeEventHash({ conversationKey, turnKey, summary }) {
  return sha256(`${conversationKey}::${turnKey}::${normalizeText(summary)}`);
}

export function detectSemanticDuplicate(candidate, recentEvidence, threshold = 0.9) {
  for (const ev of recentEvidence) {
    const score = jaccardSimilarity(candidate.summary, ev.summary);
    if (score >= threshold) {
      return { duplicate: true, matchedEventId: ev.event_id, score };
    }
  }
  return { duplicate: false };
}
