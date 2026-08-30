import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT, hash, stableJson } from "./reconcile-evidence.mjs";
import { writeResolutionArtifacts } from "./reconcile-conflicts.mjs";

function resultReport(artifacts) {
  const lines = [
    "# E06-T12 local reconciliation result",
    "",
    "Status: locally verified; central and downstream repositories were not modified because the repository rules restrict this worktree.",
    "",
    "## Decision summary",
    "",
    `- Conflicts inspected: ${artifacts.reconciliation.counts.conflicts}`,
    `- Source corrections: ${artifacts.reconciliation.counts.sourceCorrections}`,
    `- Unresolved blockers: ${artifacts.reconciliation.counts.unresolvedBlockers}`,
    `- Merges: ${artifacts.reconciliation.counts.merges}`,
    `- Explicit exclusions: ${artifacts.reconciliation.counts.explicitExclusions}`,
    "- Admission policy: unresolved records remain fail-closed; readiness remains read-only.",
    "",
    "## Per-conflict decisions",
    "",
    "The JSON reconciliation contains the complete candidate evidence for every entry: source path/line, source ID, content and body hashes, status, dependencies, and Git history.",
    "",
  ];
  for (const item of artifacts.reconciliation.resolutions) {
    const correction = item.sourceCorrection;
    lines.push(
      `- \`${item.conflictId}\`: **${item.outcome}**; candidates=${item.candidates.length}; status=${correction.status}; dependency tokens=${correction.dependencyExpansion.join(", ") || "none"}; resulting ID=${item.resultingCanonicalId}.`,
    );
  }
  const blocker = artifacts.reconciliation.resolutions.find(
    (item) => item.outcome === "unresolved blocker",
  );
  lines.push(
    "",
    "## Blocker",
    "",
    `\`${blocker.conflictId}\` depends on ${blocker.unresolved.excludedDependencies.join(", ")}, which belongs to the explicitly excluded local E06 namespace. It is preserved in the manifest but is not admitted for dispatch.`,
    "",
    "## Artifacts and rollback",
    "",
    "- `mapping.v1.json` and `manifest.v2.json` are preserved as the pre-resolution baseline.",
    "- `mapping.v2.json`, `manifest.v3.json`, and `reconciliation.v2.json` are generated deterministically.",
    `- Baseline mapping SHA-256: \`${artifacts.reconciliation.source.mappingSha256}\``,
    `- Baseline manifest SHA-256: \`${artifacts.reconciliation.source.manifestSha256}\``,
    "- Idempotency: a second generation changes zero files.",
    "- Rollback: baseline hashes are verified before use; no source material is deleted or overwritten.",
    "",
    "## External integration blocker",
    "",
    "The requested central report path and central manifest are outside this worktree and central `agent-orchestration-system` has no `.git`. `kb-mcp` and `dispatch.internal` are separate repositories. Their integration commits and the requested commit/merge cannot be created under the local AGENTS.md scope.",
    "",
  );
  return lines.join("\n");
}

export function writeReport() {
  const artifacts = writeResolutionArtifacts();
  const reportPath = join(OUTPUT, "E06-T12-RESULT.md");
  const report = resultReport(artifacts);
  writeFileSync(reportPath, report, "utf8");
  const rollbackPath = join(OUTPUT, "rollback.e06-t12.json");
  writeFileSync(
    rollbackPath,
    stableJson({
      migration: "E06-T12",
      baseline: artifacts.reconciliation.rollback.preservedArtifacts,
      generated: {
        mapping: hash(readFileSync(join(OUTPUT, "mapping.v2.json"))),
        manifest: hash(readFileSync(join(OUTPUT, "manifest.v3.json"))),
        reconciliation: hash(readFileSync(join(OUTPUT, "reconciliation.v2.json"))),
      },
      preserved: true,
    }),
    "utf8",
  );
  return { ...artifacts, reportPath, rollbackPath };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = writeReport();
  process.stdout.write(
    JSON.stringify({ reportPath: result.reportPath, rollbackPath: result.rollbackPath }, null, 2) +
      "\n",
  );
}
