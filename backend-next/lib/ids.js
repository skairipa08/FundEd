import crypto from "crypto";

export function buildId(prefix) {
  const hex = crypto.randomUUID().replace(/-/g, "");
  return `${prefix}_${hex.slice(0, 12)}`;
}

export function nowIso() {
  return new Date().toISOString();
}
