import { createHash } from "node:crypto";

export function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sourceKey(record) {
  return record.sourcePath + ":" + (record.sourceLine ?? "?");
}
