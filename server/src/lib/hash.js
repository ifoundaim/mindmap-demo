import { createHash } from "node:crypto";

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function stableObjectHash(payload) {
  const sorted = JSON.stringify(payload, Object.keys(payload).sort());
  return sha256(sorted);
}
