export function normalizeText(input) {
  return (input || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function uniqueLower(values = []) {
  return Array.from(new Set(values.map((v) => String(v || "").toLowerCase()).filter(Boolean)));
}

export function tokenize(text) {
  return normalizeText(text).split(" ").filter((x) => x.length > 1);
}

export function jaccardSimilarity(a, b) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  if (sa.size === 0 || sb.size === 0) return 0;
  let overlap = 0;
  for (const t of sa) {
    if (sb.has(t)) overlap += 1;
  }
  return overlap / (sa.size + sb.size - overlap);
}
