import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASELINE_MANIFEST,
  BASELINE_MAPPING,
  OUTPUT,
  RESOLVED_AT,
  hash,
  readJson,
  resolutionFor,
  stableJson,
} from "./reconcile-evidence.mjs";

function applyResolution(record, resolution) {
  const result = { ...record, reconciliation: { ...record.reconciliation, resolution } };
  if (resolution.outcome === "source correction") {
    result.status = resolution.sourceCorrection.status;
    result.dependencies = resolution.sourceCorrection.dependencies;
    result.reconciliation = {
      ...result.reconciliation,
      outcome: "source correction",
      admission: "eligible",
      statusEvidence: resolution.candidates.map((candidate) => candidate.status),
      matchedSources: resolution.candidates,
    };
  } else {
    result.reconciliation = {
      ...result.reconciliation,
      outcome: "unresolved blocker",
      admission: "blocked",
      matchedSources: resolution.candidates,
    };
  }
  return result;
}

function resolutionRecords(mapping) {
  return mapping.records
    .filter((record) => record.reconciliation?.outcome === "conflict")
    .map((record) => ({ record, resolution: resolutionFor(record, mapping) }));
}

export function buildResolution() {
  const mapping = readJson(BASELINE_MAPPING);
  const manifest = readJson(BASELINE_MANIFEST);
  const resolutions = resolutionRecords(mapping);
  const resolvedById = new Map(
    resolutions.map(({ record, resolution }) => [
      record.sourceId,
      applyResolution(record, resolution),
    ]),
  );
  const records = mapping.records.map((record) => resolvedById.get(record.sourceId) ?? record);
  const resolutionList = resolutions.map(({ record, resolution }) => ({
    conflictId: record.canonicalId,
    ...resolution,
  }));
  const sourceCorrections = resolutionList.filter((item) => item.outcome === "source correction");
  const blockers = resolutionList.filter((item) => item.outcome === "unresolved blocker");
  const mappingV2 = {
    ...mapping,
    formatVersion: 2,
    previousArtifact: ".plan/migrations/E06-T09/mapping.v1.json",
    records,
    resolution: {
      migration: "E06-T12",
      sourceCorrections: sourceCorrections.length,
      unresolvedBlockers: blockers.length,
      conflicts: resolutionList,
    },
  };
  const manifestRecords = manifest.records.map(
    (record) => resolvedById.get(record.sourceId) ?? record,
  );
  const manifestV3 = {
    ...manifest,
    version: "3",
    formatVersion: 3,
    count: manifestRecords.length,
    source: {
      ...manifest.source,
      mappingPath: ".plan/migrations/E06-T09/mapping.v2.json",
      previousManifestPath: ".plan/migrations/E06-T09/manifest.v2.json",
      reconciliationPath: ".plan/migrations/E06-T09/reconciliation.v2.json",
    },
    records: manifestRecords,
    resolution: {
      migration: "E06-T12",
      sourceCorrections: sourceCorrections.length,
      unresolvedBlockers: blockers.length,
      conflictPolicy: "fail-closed",
    },
  };
  const baseline = {
    mappingPath: ".plan/migrations/E06-T09/mapping.v1.json",
    manifestPath: ".plan/migrations/E06-T09/manifest.v2.json",
    mappingSha256: hash(readFileSync(BASELINE_MAPPING)),
    manifestSha256: hash(readFileSync(BASELINE_MANIFEST)),
  };
  const reconciliation = {
    schemaVersion: 2,
    migration: "E06-T12",
    projectId: "freevilisation",
    policy: {
      authority: "epic-table",
      sourceMaterial: "preserve",
      unresolvedAdmission: "fail-closed",
      readiness: "read-only",
    },
    source: baseline,
    counts: {
      conflicts: resolutionList.length,
      sourceCorrections: sourceCorrections.length,
      unresolvedBlockers: blockers.length,
      merges: 0,
      explicitExclusions: 0,
    },
    resolutions: resolutionList,
    rollback: {
      preservedArtifacts: [
        { path: baseline.mappingPath, sha256: baseline.mappingSha256 },
        { path: baseline.manifestPath, sha256: baseline.manifestSha256 },
      ],
      tested: true,
      method: "hash-verified baseline remains untouched and v3 points to both baseline artifacts",
    },
    integrations: {
      "kb-mcp": { status: "not updated", reason: "outside authorized worktree" },
      "dispatch.internal": { status: "not updated", reason: "outside authorized worktree" },
    },
  };
  return {
    mappingV2,
    manifestV3,
    reconciliation,
    resolutions: resolutionList,
    resolvedAt: RESOLVED_AT,
  };
}

export function writeResolutionArtifacts() {
  const artifacts = buildResolution();
  const files = new Map([
    [join(OUTPUT, "mapping.v2.json"), artifacts.mappingV2],
    [join(OUTPUT, "manifest.v3.json"), artifacts.manifestV3],
    [join(OUTPUT, "reconciliation.v2.json"), artifacts.reconciliation],
  ]);
  const changes = [];
  for (const [path, value] of files) {
    const content = stableJson(value);
    const before = existsSync(path) ? readFileSync(path, "utf8") : null;
    if (before !== content) writeFileSync(path, content, "utf8");
    changes.push({ path, changed: before !== content, sha256: hash(content) });
  }
  return { ...artifacts, changes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = writeResolutionArtifacts();
  process.stdout.write(
    JSON.stringify({ changes: result.changes, counts: result.reconciliation.counts }, null, 2) +
      "\n",
  );
}
