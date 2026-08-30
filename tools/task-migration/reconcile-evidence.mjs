import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const OUTPUT = join(ROOT, ".plan", "migrations", "E06-T09");
export const RESOLVED_AT = "2026-08-30T00:00:00.000Z";
export const BASELINE_MANIFEST = join(OUTPUT, "manifest.v2.json");
export const BASELINE_MAPPING = join(OUTPUT, "mapping.v1.json");

export function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function stableJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

function splitTableCells(line) {
  const cells = [];
  let cell = "";
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === "\\" && line[index + 1] === "|") {
      cell += "|";
      index += 1;
    } else if (character === "|") {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  if (cells[0] === "") cells.shift();
  if (cells.at(-1) === "") cells.pop();
  return cells;
}

function sourceLine(source) {
  const path = join(ROOT, ".plan", source.sourcePath);
  const lines = readFileSync(path, "utf8").split(/\r?\n/u);
  return lines[source.sourceLine - 1] ?? "";
}

function history(source) {
  try {
    const output = execFileSync(
      "git",
      [
        "-C",
        join(ROOT, ".plan"),
        "blame",
        "--porcelain",
        "-L",
        `${source.sourceLine},${source.sourceLine}`,
        "--",
        source.sourcePath,
      ],
      { encoding: "utf8" },
    );
    return {
      commit: output.match(/^([0-9a-f]{40}) /mu)?.[1] ?? null,
      authorTime: output.match(/^author-time (\d+)/mu)?.[1] ?? null,
      summary: output.match(/^summary (.*)$/mu)?.[1] ?? null,
    };
  } catch {
    return { commit: null, authorTime: null, summary: null };
  }
}

function statusFromRow(row) {
  return /✅|\[x\]|\bdone\b|\bcompleted\b/iu.test(row) ? "completed" : "ready";
}

function epicRow(source) {
  const raw = sourceLine(source);
  const cells = splitTableCells(raw);
  const sourceId = (cells[0] ?? "").match(/\b(E\d+-W\d+(?:[A-Z])?-T\d+)\b/iu)?.[1];
  const taskBody = cells[1] ?? "";
  return {
    raw,
    sourceId: sourceId?.toUpperCase() ?? "",
    status: statusFromRow(raw),
    taskBody,
    dependencyText: cells[4] ?? "",
    contentSha256: hash(raw),
    taskBodySha256: hash(taskBody),
  };
}

function candidateEvidence(source, primary) {
  const raw = sourceLine(source);
  const epic = source.population === "epic-table" ? epicRow(source) : null;
  return {
    population: source.population,
    sourcePath: source.sourcePath,
    sourceLine: source.sourceLine,
    sourceId: source.sourceId,
    status: source.status,
    epicStatus: primary.epicStatus,
    dependencyText: epic?.dependencyText ?? null,
    taskBody: epic?.taskBody ?? null,
    contentSha256: hash(raw),
    taskBodySha256: epic?.taskBodySha256 ?? hash(raw),
    history: history(source),
  };
}

function dependencyTokens(value) {
  return [...value.matchAll(/\b(E\d+(?:-W\d+(?:[A-Z])?(?:-T\d+)?)?)\b/giu)].map((match) =>
    match[1].toUpperCase(),
  );
}

function canonicalId(record) {
  return record.inclusion === "excluded"
    ? `freevilisation:local:${record.sourceId}`
    : `freevilisation:${record.sourceId}`;
}

function expandDependencies(raw, records) {
  if (!raw || /^(?:—|-|none|nothing)/iu.test(raw.trim()))
    return { ids: [], excluded: [], unknown: [] };
  const tokens = dependencyTokens(raw);
  const ids = new Set();
  const excluded = new Set();
  const unknown = new Set();
  for (const token of tokens) {
    const matches = records.filter(
      (record) => record.sourceId === token || record.sourceId.startsWith(`${token}-`),
    );
    if (!matches.length) {
      unknown.add(token);
      continue;
    }
    for (const record of matches) {
      ids.add(canonicalId(record));
      if (record.inclusion === "excluded") excluded.add(canonicalId(record));
    }
  }
  if (!tokens.length) unknown.add(raw.trim());
  return { ids: [...ids].sort(), excluded: [...excluded].sort(), unknown: [...unknown].sort() };
}

export function resolutionFor(record, mapping) {
  const primary = record.reconciliation.matchedSources.find(
    (source) => source.population === "epic-table",
  );
  if (!primary) throw new Error(`Missing primary source for ${record.sourceId}`);
  const row = epicRow(primary);
  if (row.sourceId !== record.sourceId)
    throw new Error(`Source ID mismatch for ${record.sourceId}`);
  const candidates = record.reconciliation.matchedSources.map((source) =>
    candidateEvidence(source, record),
  );
  const dependencyResult = expandDependencies(row.dependencyText, mapping.records);
  const statusValues = [...new Set(candidates.map((candidate) => candidate.status))].sort();
  const unresolved = dependencyResult.excluded.length > 0 || dependencyResult.unknown.length > 0;
  const outcome = unresolved ? "unresolved blocker" : "source correction";
  const reason = unresolved
    ? "The source dependency expands to an explicitly excluded local record; admission remains fail-closed."
    : statusValues.length > 1
      ? "EPIC.md is authoritative; the legacy status is corroborating evidence and is corrected to the primary status."
      : "The EPIC.md table is authoritative; escaped table pipes and documented epic/wave shorthand are normalized without editing source material.";
  return {
    outcome,
    resolver: "E06-T12 deterministic reconciler",
    resolvedAt: RESOLVED_AT,
    candidates,
    decisionReason: reason,
    resultingCanonicalId: record.canonicalId,
    sourceCorrection: {
      status: row.status,
      dependencyText: row.dependencyText,
      dependencies: dependencyResult.ids,
      dependencyExpansion: dependencyTokens(row.dependencyText),
    },
    unresolved: {
      excludedDependencies: dependencyResult.excluded,
      unknownDependencies: dependencyResult.unknown,
    },
    rollback: {
      manifestPath: ".plan/migrations/E06-T09/manifest.v2.json",
      mappingPath: ".plan/migrations/E06-T09/mapping.v1.json",
      manifestSha256: hash(readFileSync(BASELINE_MANIFEST)),
      mappingSha256: hash(readFileSync(BASELINE_MAPPING)),
      preserved: true,
    },
  };
}
