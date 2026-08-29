import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parsePlanningTree } from "./source-parser.mjs";
import {
  applyMigration as applyMigrationFiles,
  rollbackMigration as rollbackMigrationFiles,
} from "./migration-files.mjs";
import { sha256, sourceKey, stableJson } from "./migration-utils.mjs";

const HISTORICAL_COUNT = 486;
const LOCAL_EPIC = "E06";

function sourceHashes(projectRoot, tree) {
  const records = [...tree.epicRows, ...tree.legacyRows, ...tree.standaloneRows]
    .map((record) => record.sourcePath)
    .filter(Boolean);
  const paths = [...new Set(records)].sort();
  return paths.map((sourcePath) => ({
    sourcePath,
    sha256: sha256(readFileSync(join(projectRoot, ".plan", sourcePath), "utf8")),
  }));
}

function sourcesFor(id, tree) {
  return [
    ...tree.epicRows.filter((row) => row.sourceId === id),
    ...tree.legacyRows.filter((row) => row.sourceId === id),
    ...tree.standaloneRows.filter((row) => row.sourceId === id),
  ].sort((left, right) => sourceKey(left).localeCompare(sourceKey(right)));
}

function reconciliation(id, primary, matches) {
  const comparable = matches.filter((record) => record.status && record.status !== "blocked");
  const statuses = [...new Set(comparable.map((record) => record.status))];
  const conflict = statuses.length > 1 || matches.some((record) => record.parseIssue);
  return {
    outcome: conflict ? "conflict" : "authoritative",
    authority: "epic-table",
    canonicalId: "freevilisation:" + id,
    reason: conflict
      ? "source populations disagree or contain an unparseable field"
      : "EPIC.md task row is authoritative; other populations are corroborating evidence",
    statusEvidence: statuses,
    matchedSources: matches.map((record) => ({
      population: record.sourcePopulation,
      sourcePath: record.sourcePath,
      sourceId: record.sourceId,
      sourceLine: record.sourceLine,
      status: record.status,
      parseIssue: record.parseIssue ?? null,
    })),
    primarySource: sourceKey(primary),
  };
}

function canonicalTask(primary, matches) {
  const id = primary.sourceId;
  const local = primary.epicId === LOCAL_EPIC;
  const rec = reconciliation(id, primary, matches);
  return {
    canonicalId: local ? "freevilisation:local:" + id : "freevilisation:" + id,
    sourcePath: primary.sourcePath,
    sourceId: id,
    sourceLine: primary.sourceLine,
    sourcePopulation: primary.sourcePopulation,
    originalStatus: primary.originalStatus,
    status: primary.status,
    epicId: primary.epicId,
    epicStatus: primary.epicStatus,
    dependencies: primary.dependencies,
    inclusion: local ? "excluded" : "included",
    exclusionReason: local
      ? "reserved local E06-placeholder-art namespace; not a Dispatch task"
      : null,
    reconciliation: local
      ? { ...rec, outcome: "excluded", reason: "reserved local namespace" }
      : rec,
  };
}

function unsupportedRecords(tree) {
  return [...tree.standaloneRows.filter((record) => record.parseIssue), ...tree.otherArtifacts]
    .map((record) => {
      const sourceId =
        record.sourceId ??
        "UNSUPPORTED:" + sha256(record.sourcePath + ":" + (record.sourceLine ?? "?")).slice(0, 16);
      const exclusionReason =
        record.parseIssue ??
        record.reason ??
        "task-like artifact has no supported canonical task representation";
      return {
        sourcePopulation: record.sourcePopulation ?? "other-task-like-artifact",
        sourcePath: record.sourcePath,
        sourceId,
        sourceLine: record.sourceLine ?? null,
        canonicalId: "freevilisation:unsupported:" + sourceId.replace(/^UNSUPPORTED:/, ""),
        status: "blocked",
        epicId: record.epicId ?? null,
        dependencies: [],
        exclusionReason,
        reconciliation: { outcome: "unsupported", reason: exclusionReason },
      };
    })
    .sort((left, right) =>
      (left.sourcePath + ":" + left.sourceLine).localeCompare(
        right.sourcePath + ":" + right.sourceLine,
      ),
    );
}

export function buildMigration(projectRoot) {
  const root = resolve(projectRoot);
  const tree = parsePlanningTree(root);
  const primaryIds = [...new Set(tree.epicRows.map((row) => row.sourceId))].sort();
  const primary = primaryIds.map((id) =>
    canonicalTask(
      tree.epicRows.find((row) => row.sourceId === id),
      sourcesFor(id, tree),
    ),
  );
  const included = primary.filter((record) => record.inclusion === "included");
  const excluded = primary.filter((record) => record.inclusion === "excluded");
  const unsupported = unsupportedRecords(tree);
  const files = sourceHashes(root, tree);
  const mapping = {
    formatVersion: 1,
    migration: "E06-T09",
    projectId: "freevilisation",
    authoritativePopulation: "epic-table",
    records: primary,
    unsupportedRecords: unsupported,
    historicalAdapter: {
      observedRecordCount: HISTORICAL_COUNT,
      evidencePath: "agent-orchestration-system/HANDOFF.md:53",
      reconciliation:
        "historical adapter rows are preserved as a population count because the adapter did not persist a replayable source-to-ID export",
    },
  };
  const census = {
    formatVersion: 1,
    migration: "E06-T09",
    projectId: "freevilisation",
    sourceTreeHash: sha256(stableJson(files)),
    populations: {
      epicTable: {
        observedRecords: tree.epicRows.length,
        uniqueSourceIds: new Set(tree.epicRows.map((row) => row.sourceId)).size,
        excludedLocalNamespace: excluded.length,
        acceptedLogicalTasks: included.length,
      },
      legacyTaskLogs: {
        observedRecords: tree.legacyRows.length,
        files: [...new Set(tree.legacyRows.map((row) => row.sourcePath))].sort(),
        matchedToEpicRows: tree.legacyRows.filter((row) => primaryIds.includes(row.sourceId))
          .length,
      },
      standaloneTaskFiles: {
        observedRecords: tree.standaloneRows.length,
        canonicalRecords: tree.standaloneRows.filter((row) => !row.parseIssue).length,
        unsupportedRecords: tree.standaloneRows.filter((row) => row.parseIssue).length,
      },
      otherTaskLikeArtifacts: { observedRecords: tree.otherArtifacts.length },
      historicalAdapter: {
        observedRecords: HISTORICAL_COUNT,
        evidencePath: "agent-orchestration-system/HANDOFF.md:53",
      },
    },
    files,
    reconciliation: {
      accepted: included.length,
      excluded: excluded.length,
      duplicateEvidence:
        tree.legacyRows.filter((row) => primaryIds.includes(row.sourceId)).length +
        tree.standaloneRows.filter((row) => row.sourceId && primaryIds.includes(row.sourceId))
          .length,
      conflicts: primary.filter((record) => record.reconciliation.outcome === "conflict").length,
      unsupported: unsupported.length,
      historicalOnly: HISTORICAL_COUNT,
    },
  };
  const manifest = {
    version: "2",
    formatVersion: 2,
    projectId: "freevilisation",
    count: included.length,
    source: {
      kind: "epic-task-table",
      root: "epics",
      authority: "EPIC.md first-cell task IDs; E06-placeholder-art excluded",
      selectedRecordCount: included.length,
      censusPath: ".plan/migrations/E06-T09/census.v1.json",
      mappingPath: ".plan/migrations/E06-T09/mapping.v1.json",
    },
    records: included,
    exclusions: [...excluded, ...unsupported].map((record) => ({
      ...record,
      exclusionReason: record.exclusionReason ?? record.reconciliation.reason,
      reason: record.exclusionReason ?? record.reconciliation.reason,
    })),
  };
  return {
    tree,
    census,
    mapping,
    manifest,
    canonicalCollections: [...new Set(tree.legacyRows.map((record) => record.sourcePath))].sort(),
  };
}

export function applyMigration(
  projectRoot,
  outputRoot = join(projectRoot, ".plan", "migrations", "E06-T09"),
) {
  return applyMigrationFiles(projectRoot, outputRoot, buildMigration);
}

export function rollbackMigration(outputRoot) {
  return rollbackMigrationFiles(outputRoot);
}
