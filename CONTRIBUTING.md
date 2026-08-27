# Contributing

## Quality gates

Every merge to `main` must pass every required check — no merging around a
gate, no fixing it later.

These jobs from `.github/workflows/ci.yml` run on every pull request and
block a merge if any of them is red or skipped:

- `format` — `prettier --check`
- `typecheck` — `tsc --build`
- `lint` — ESLint across the monorepo
- `commitlint` — Conventional Commits format on every commit in the PR
- `test` — the Vitest suite
- `determinism` — replay tests matching `*.determinism.test.ts`
- `coverage` — per-package line-coverage floor
- `size-limit` — the `apps/client` production bundle budget
- `preview-deploy` — a build-and-deploy smoke check for `apps/client`

E34 extends this pipeline: long-game and cross-browser determinism replays
and a performance-regression probe join the PR-blocking checks above. Only
the balance-simulation harness and the command-validation fuzz suite move
to a nightly schedule instead, because they are too slow to gate every PR.

See [`docs/BRANCH_PROTECTION.md`](docs/BRANCH_PROTECTION.md) for the exact
GitHub branch-protection settings that enforce this rule once enabled, and
[CLAUDE.md](CLAUDE.md) for the engineering conventions every change follows
(build order, hex geometry, command validation, determinism).
