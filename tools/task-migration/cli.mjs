import { join, resolve } from "node:path";
import { applyMigration, buildMigration, rollbackMigration } from "./migration.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const projectRoot = resolve(argument("--project-root", resolve(import.meta.dirname, "../..")));
const outputRoot = resolve(
  argument("--output", join(projectRoot, ".plan", "migrations", "E06-T09")),
);
const mode = process.argv.includes("--apply")
  ? "apply"
  : process.argv.includes("--rollback")
    ? "rollback"
    : "dry-run";

if (mode === "rollback") {
  process.stdout.write(
    JSON.stringify({ mode, removed: rollbackMigration(outputRoot) }, null, 2) + "\n",
  );
} else if (mode === "apply") {
  const result = applyMigration(projectRoot, outputRoot);
  process.stdout.write(
    JSON.stringify(
      {
        mode,
        files: result.files,
        census: result.migration.census.populations,
        manifestCount: result.migration.manifest.records.length,
      },
      null,
      2,
    ) + "\n",
  );
} else {
  const result = buildMigration(projectRoot);
  process.stdout.write(
    JSON.stringify(
      {
        mode,
        census: result.census,
        manifestCount: result.manifest.records.length,
        exclusionCount: result.manifest.exclusions.length,
      },
      null,
      2,
    ) + "\n",
  );
}
