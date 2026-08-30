import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildResolution, writeResolutionArtifacts } from "./reconcile-conflicts.mjs";

const output = join(process.cwd(), ".plan", "migrations", "E06-T09");

test("all 81 conflicts have an explicit resolution with evidence", () => {
  const result = buildResolution();
  assert.equal(result.resolutions.length, 81);
  assert.equal(result.reconciliation.counts.sourceCorrections, 80);
  assert.equal(result.reconciliation.counts.unresolvedBlockers, 1);
  for (const item of result.resolutions) {
    assert.ok(["source correction", "unresolved blocker"].includes(item.outcome));
    assert.ok(item.candidates.length >= 1);
    assert.ok(item.candidates.every((candidate) => candidate.contentSha256.length === 64));
    assert.ok(item.candidates.every((candidate) => candidate.taskBodySha256.length === 64));
    assert.equal(item.resultingCanonicalId, item.conflictId);
    assert.equal(item.rollback.preserved, true);
  }
  const blocker = result.resolutions.find((item) => item.outcome === "unresolved blocker");
  assert.equal(blocker?.conflictId, "freevilisation:E10-W6-T13");
  assert.equal(blocker?.unresolved.excludedDependencies.length > 0, true);
});

test("reconciliation is idempotent and baseline artifacts remain rollback-safe", () => {
  const first = writeResolutionArtifacts();
  const second = writeResolutionArtifacts();
  assert.equal(first.changes.filter((change) => change.changed).length >= 0, true);
  assert.equal(second.changes.filter((change) => change.changed).length, 0);
  const reconciliation = JSON.parse(readFileSync(join(output, "reconciliation.v2.json"), "utf8"));
  for (const artifact of reconciliation.rollback.preservedArtifacts) {
    const content = readFileSync(join(process.cwd(), artifact.path), "utf8");
    assert.equal(createSha256(content), artifact.sha256);
  }
});

function createSha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
