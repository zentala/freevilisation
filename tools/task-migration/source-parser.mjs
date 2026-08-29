import { basename, relative, resolve } from "node:path";
import { existsSync, readdirSync, readFileSync } from "node:fs";

export const TASK_ID_RE = /\b(E\d+-W\d+(?:[A-Z])?-T\d+)\b/i;
const TASK_ID_GLOBAL_RE = new RegExp(TASK_ID_RE.source, "ig");
const TASK_REF_RE = /\b(E\d+-W\d+(?:[A-Z])?(?:-T\d+)?)\b/i;
const TABLE_SEPARATOR_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/;
const STATUS_MAP = new Map([
  ["done", "completed"],
  ["completed", "completed"],
  ["complete", "completed"],
  ["todo", "ready"],
  ["pending", "ready"],
  ["open", "ready"],
  ["in-progress", "in-progress"],
  ["in_progress", "in-progress"],
  ["active", "in-progress"],
  ["blocked", "blocked"],
  ["cancelled", "cancelled"],
]);

function cells(line) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

function taskId(value) {
  const match = String(value)
    .replace(/[\[\]*`]/g, "")
    .match(TASK_ID_RE);
  return match?.[1]?.toUpperCase() ?? null;
}

function statusFromText(text, fallback = "ready") {
  if (/\bblocked\b/i.test(text)) return "blocked";
  if (/✅|\[x\]|\bdone\b|\bcompleted\b/i.test(text)) return "completed";
  if (/\bcancel(?:led|ed)\b/i.test(text)) return "cancelled";
  return STATUS_MAP.get(String(fallback).trim().toLowerCase()) ?? fallback;
}

function frontmatter(raw) {
  const match = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  const fields = new Map();
  for (const line of match?.[1]?.split(/\r?\n/g) ?? []) {
    const field = line.match(/^([A-Za-z][\w-]*):\s*(.*?)\s*$/);
    if (field) fields.set(field[1], field[2].replace(/^['"]|['"]$/g, ""));
  }
  return fields;
}

function dependencies(value) {
  if (!value || /^(?:—|-|none|nothing|n\/a)$/i.test(value.trim()))
    return { values: [], error: null };
  const values = [...value.matchAll(TASK_ID_GLOBAL_RE)].map(
    (match) => `freevilisation:${match[1].toUpperCase()}`,
  );
  if (!values.length)
    return { values: [], error: `unsupported dependency expression: ${value.trim()}` };
  return { values: [...new Set(values)].sort(), error: null };
}

function epicStatus(raw) {
  const data = frontmatter(raw);
  return STATUS_MAP.get((data.get("status") ?? "in-progress").toLowerCase()) ?? "blocked";
}

function epicRows(raw, sourcePath, epicId) {
  const lines = raw.split(/\r?\n/g);
  const rows = [];
  for (let index = 0; index + 1 < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|") || !TABLE_SEPARATOR_RE.test(lines[index + 1].trim()))
      continue;
    const headers = cells(lines[index]).map((value) => value.toLowerCase());
    const idColumn = headers.findIndex((value) => value === "id" || value === "task id");
    const taskColumn = headers.findIndex((value) => value === "task" || value === "description");
    const dependencyColumn = headers.findIndex((value) => /dependenc|depends? on/.test(value));
    if (idColumn !== 0 || taskColumn < 0) {
      index += 1;
      continue;
    }
    let cursor = index + 2;
    for (; cursor < lines.length && lines[cursor].trim().startsWith("|"); cursor += 1) {
      const values = cells(lines[cursor]);
      const sourceId = taskId(values[idColumn] ?? "");
      if (!sourceId) continue;
      const dependency = dependencies(dependencyColumn < 0 ? "" : (values[dependencyColumn] ?? ""));
      rows.push({
        sourcePopulation: "epic-table",
        sourcePath,
        sourceId,
        sourceLine: cursor + 1,
        epicId,
        task: values[taskColumn] ?? "",
        originalStatus: values.join(" "),
        status: statusFromText(values.join(" ")),
        epicStatus: null,
        dependencies: dependency.values,
        parseIssue: dependency.error,
      });
    }
    index = cursor - 1;
  }
  return rows;
}

function legacyRows(raw, sourcePath, epicId) {
  const rows = [];
  const lines = raw.split(/\r?\n/g);
  lines.forEach((line, index) => {
    const sourceId = taskId(line);
    if (!sourceId || !/^\s*-\s*\[[ xX]\]/.test(line)) return;
    rows.push({
      sourcePopulation: "legacy-task-log",
      sourcePath,
      sourceId,
      sourceLine: index + 1,
      epicId,
      task: line.replace(/^\s*-\s*\[[ xX]\]\s*/, "").replace(/^\S+\s+—\s+/, ""),
      originalStatus: line,
      status: /\[[xX]\]/.test(line) ? "completed" : "ready",
      epicStatus: null,
      dependencies: [],
      parseIssue: null,
    });
  });
  return rows;
}

function pathFromPlan(planRoot, file) {
  return relative(planRoot, file).replaceAll("\\", "/");
}

function epicIdFromDirectory(directory) {
  return directory.match(/^E\d+/i)?.[0].toUpperCase() ?? "UNKNOWN";
}

function walk(directory) {
  const result = [];
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const file = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...walk(file));
    else if (entry.isFile()) result.push(file);
  }
  return result;
}

function standaloneRecord(file, planRoot, epicId) {
  const raw = readFileSync(file, "utf8");
  const data = frontmatter(raw);
  const heading = raw.match(/^#\s+TASK\s+[—-]\s+([^:\s]+)/m)?.[1] ?? "";
  const reference =
    String(data.get("id") ?? data.get("taskId") ?? heading ?? basename(file, ".md"))
      .match(TASK_REF_RE)?.[1]
      ?.toUpperCase() ?? null;
  const sourceId =
    taskId(data.get("id") ?? data.get("taskId") ?? heading) ??
    taskId(`${epicId}-${basename(file, ".md")}`);
  const parseIssue = sourceId
    ? null
    : reference
      ? "non-canonical task ID; missing -T segment"
      : "no canonical ID in frontmatter, heading, or filename";
  return {
    sourcePopulation: "standalone-task-file",
    sourcePath: pathFromPlan(planRoot, file),
    sourceId: sourceId ?? reference,
    sourceLine: 1,
    epicId,
    task: null,
    originalStatus: data.get("status") ?? null,
    status: STATUS_MAP.get((data.get("status") ?? "ready").toLowerCase()) ?? "blocked",
    epicStatus: null,
    dependencies: dependencies(data.get("dependencies") ?? data.get("depends_on") ?? "").values,
    parseIssue,
  };
}

export function parsePlanningTree(projectRoot) {
  const planRoot = resolve(projectRoot, ".plan");
  const epicRoot = resolve(planRoot, "epics");
  if (!existsSync(epicRoot)) throw new Error(`Planning tree is unavailable: ${epicRoot}`);
  const epicRowsResult = [];
  const legacyRowsResult = [];
  const standaloneRows = [];
  const otherArtifacts = [];
  for (const epic of readdirSync(epicRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^E\d+-/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const epicId = epicIdFromDirectory(epic.name);
    const directory = resolve(epicRoot, epic.name);
    const epicFile = resolve(directory, "EPIC.md");
    if (existsSync(epicFile)) {
      const raw = readFileSync(epicFile, "utf8");
      const rows = epicRows(raw, pathFromPlan(planRoot, epicFile), epicId);
      const state = epicStatus(raw);
      rows.forEach((row) => {
        row.epicStatus = state;
      });
      epicRowsResult.push(...rows);
    }
    for (const file of walk(directory)) {
      const relativePath = pathFromPlan(planRoot, file);
      const raw = readFileSync(file, "utf8");
      if (basename(file) === "TASKS.md" || /^migration:\s*E06-T09\s*$/m.test(raw)) continue;
      if (basename(file) === "tasks.md")
        legacyRowsResult.push(...legacyRows(raw, relativePath, epicId));
      else if (
        file.includes(`${resolve(directory, "tasks")}${"\\"}`) &&
        basename(file).toLowerCase().endsWith(".md")
      )
        standaloneRows.push(standaloneRecord(file, planRoot, epicId));
      else if (
        basename(file).toLowerCase() !== "epic.md" &&
        /(?:task|review|journal|handoff)/i.test(basename(file))
      )
        otherArtifacts.push({
          sourcePath: relativePath,
          reason: "task-like planning artifact; no canonical task record",
        });
    }
  }
  return {
    planRoot: ".plan",
    epicRows: epicRowsResult,
    legacyRows: legacyRowsResult,
    standaloneRows,
    otherArtifacts,
  };
}
