# Freevilisation task migration

This tool creates the E06-T09 census, source mapping, canonical manifest, and
uppercase TASKS.md collections for the legacy logs. It never edits EPIC.md,
tasks.md, or standalone task bodies.

From the repository root:

```sh
node tools/task-migration/cli.mjs --dry-run
node tools/task-migration/cli.mjs --apply
node tools/task-migration/cli.mjs --rollback
```

The dry-run is read-only. Apply writes only under
.plan/migrations/E06-T09/; the original lowercase logs remain untouched.
The journal records initial ownership and output hashes. Rollback removes only
files created by this migration and refuses to remove an output edited after
the migration.

The historical 486-record adapter result is represented as an evidence-backed
population count. Its original adapter did not persist a replayable
sourcePath/sourceId export, so the migration does not invent 486 mappings.
