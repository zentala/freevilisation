import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { sha256, stableJson } from "./migration-utils.mjs";

function canonicalCollection(sourcePath, records) {
  const frontmatter = [
    "---",
    "formatVersion: 1",
    "migration: E06-T09",
    "sourcePath: " + sourcePath,
    "---",
    "",
    "# Canonical task collection",
    "",
  ];
  return [...frontmatter, ...records.map((record) => record.originalStatus), ""].join("\n");
}

function outputFiles(outputRoot, migration) {
  const files = new Map([
    [join(outputRoot, "census.v1.json"), stableJson(migration.census)],
    [join(outputRoot, "mapping.v1.json"), stableJson(migration.mapping)],
    [join(outputRoot, "manifest.v2.json"), stableJson(migration.manifest)],
    [
      join(outputRoot, "TASKS.md"),
      migration.manifest.records
        .map(
          (task) =>
            "- [" +
            (task.status === "completed" ? "x" : " ") +
            "] " +
            task.canonicalId +
            " — " +
            task.sourcePath +
            ":" +
            task.sourceLine,
        )
        .join("\n") + "\n",
    ],
  ]);
  for (const sourcePath of migration.canonicalCollections) {
    const records = migration.tree.legacyRows.filter((record) => record.sourcePath === sourcePath);
    const collectionPath = sourcePath.replace(/^epics\//, "").replace(/tasks\.md$/, "TASKS.md");
    files.set(
      join(outputRoot, "collections", collectionPath),
      canonicalCollection(sourcePath, records),
    );
  }
  return files;
}

export function applyMigration(projectRoot, outputRoot, buildMigration) {
  const migration = buildMigration(projectRoot);
  const files = outputFiles(outputRoot, migration);
  const previousPath = join(outputRoot, "journal.v1.json");
  const previous = existsSync(previousPath) ? JSON.parse(readFileSync(previousPath, "utf8")) : null;
  const previousFiles = new Map((previous?.files ?? []).map((file) => [file.path, file]));
  const journal = { formatVersion: 1, migration: "E06-T09", files: [] };
  for (const [file, content] of files) {
    mkdirSync(dirname(file), { recursive: true });
    const existed = previousFiles.get(file)?.existed ?? existsSync(file);
    const before = existsSync(file) ? readFileSync(file, "utf8") : null;
    if (before !== content) writeFileSync(file, content, "utf8");
    journal.files.push({
      path: file,
      existed,
      beforeSha256: before === null ? null : sha256(before),
      afterSha256: sha256(content),
      changed: before !== content,
    });
  }
  writeFileSync(join(outputRoot, "journal.v1.json"), stableJson(journal), "utf8");
  return { migration, journal, files: [...files.keys()] };
}

export function rollbackMigration(outputRoot) {
  const journalPath = join(outputRoot, "journal.v1.json");
  if (!existsSync(journalPath)) throw new Error("Migration journal not found: " + journalPath);
  const journal = JSON.parse(readFileSync(journalPath, "utf8"));
  for (const file of [...journal.files].reverse()) {
    if (file.existed || !existsSync(file.path)) continue;
    const current = readFileSync(file.path, "utf8");
    if (sha256(current) !== file.afterSha256)
      throw new Error("Refusing rollback after external edit: " + file.path);
    rmSync(file.path);
  }
  rmSync(journalPath);
  return journal.files.filter((file) => file.changed).map((file) => file.path);
}
