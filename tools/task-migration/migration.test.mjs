import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { applyMigration, buildMigration, rollbackMigration } from "./migration.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "freevilisation-migration-"));
  const epic = join(root, ".plan", "epics", "E08-ui");
  const local = join(root, ".plan", "epics", "E06-placeholder-art");
  mkdirSync(epic, { recursive: true });
  mkdirSync(local, { recursive: true });
  writeFileSync(join(root, ".plan", "HANDOFF.md"), "# Handoff\n");
  writeFileSync(join(root, ".plan", "STATE.md"), "# State\n");
  writeFileSync(
    join(epic, "EPIC.md"),
    [
      "---",
      "status: in-progress",
      "---",
      "",
      "| ID | Task | Depends on |",
      "|---|---|---|",
      "| E08-W1-T1 | first | — |",
      "| E08-W1-T2 | second | E08-W1-T1 |",
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(epic, "tasks.md"),
    "# Legacy\n\n- [ ] E08-W1-T1 — first\n- [x] E08-W1-T2 — second\n",
  );
  writeFileSync(
    join(local, "EPIC.md"),
    [
      "---",
      "status: done",
      "---",
      "",
      "| ID | Task |",
      "|---|---|",
      "| E06-W1-T1 | local |",
      "",
    ].join("\n"),
  );
  return root;
}

test("dry-run is read-only and deterministic", () => {
  const root = fixture();
  try {
    const before = JSON.stringify(buildMigration(root));
    const after = JSON.stringify(buildMigration(root));
    assert.equal(after, before);
    assert.equal(
      buildMigration(root).manifest.records[1].dependencies[0],
      "freevilisation:E08-W1-T1",
    );
    assert.equal(
      buildMigration(root).manifest.exclusions[0].canonicalId,
      "freevilisation:local:E06-W1-T1",
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("apply is idempotent and rollback removes only generated files", () => {
  const root = fixture();
  try {
    const first = applyMigration(root);
    const firstBytes = readFileSync(
      join(root, ".plan", "migrations", "E06-T09", "mapping.v1.json"),
      "utf8",
    );
    const second = applyMigration(root);
    assert.equal(
      readFileSync(join(root, ".plan", "migrations", "E06-T09", "mapping.v1.json"), "utf8"),
      firstBytes,
    );
    assert.equal(second.journal.files.filter((file) => file.changed).length, 0);
    assert.ok(first.files.some((file) => file.endsWith("TASKS.md")));
    rollbackMigration(join(root, ".plan", "migrations", "E06-T09"));
    assert.equal(exists(join(root, ".plan", "migrations", "E06-T09", "mapping.v1.json")), false);
    assert.equal(
      readFileSync(join(root, ".plan", "epics", "E08-ui", "tasks.md"), "utf8").startsWith(
        "# Legacy",
      ),
      true,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("the real planning tree has a complete reconciled census", () => {
  const result = buildMigration(repoRoot);
  assert.equal(result.census.populations.epicTable.observedRecords, 588);
  assert.equal(result.census.populations.legacyTaskLogs.observedRecords, 60);
  assert.equal(result.census.populations.standaloneTaskFiles.observedRecords, 32);
  assert.equal(result.census.populations.otherTaskLikeArtifacts.observedRecords, 8);
  assert.equal(result.census.reconciliation.accepted, 580);
  assert.equal(result.census.reconciliation.excluded, 8);
  assert.equal(result.census.reconciliation.historicalOnly, 486);
});

test("conflicting corroboration is explicit and fail-closed", () => {
  const result = buildMigration(repoRoot);
  const task = result.manifest.records.find((record) => record.sourceId === "E08-W4-T1");
  assert.equal(task?.reconciliation.outcome, "conflict");
  assert.ok((task?.reconciliation.matchedSources.length ?? 0) >= 2);
});

function exists(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}
