# AGENTS.md — rules for coding agents in this repo

## Scope

Work ONLY inside the directory you were started in. Never touch files outside
it, never `git merge`, never `git push`. The orchestrating agent merges.

## What this repo is

Browser-based, turn-based 4X strategy game (Civ-like), AGPL-3.0, TypeScript
pnpm monorepo. Planning lives in `.plan/` (a separate nested git repo,
gitignored here) — read it, never commit to it from a worktree.

## Non-negotiable invariants

- `packages/engine` is **pure and deterministic**: no DOM, no `Date`, no
  `Math.random`, no `window`/`document`/`fetch`/`WebSocket`. Seeded RNG only.
  Same seed + same command list → same state, always.
- Every `GameState` mutation is a serializable **Command**, never a direct
  mutation.
- Game content (units, buildings, techs, terrain) is **data, not code** —
  zod-validated rulesets.
- Package dependency directions are enforced by ESLint; do not work around
  a boundary error by loosening the rule.
- Entity ids are **branded**, and the brands are nominally distinct even though
  the runtime value is the same string. `makeEntityId()` returns a plain
  `EntityId`; assigning it to a narrower id needs an explicit cast —
  `makeEntityId(state.nextEntitySeq) as CityId` (see
  `packages/engine/src/commands/pipeline.ts:101`). The cast is the intended
  shape, not a smell: it is the one place the narrowing is stated. Do not
  "fix" it by widening the branded types.

## Code style

- Files ≤ 250 lines, functions ≤ 50 lines. Larger = split it. This is an
  ESLint `max-lines` error, not a convention — split as you write, because
  the build refuses the file either way. Test files are not exempt; the
  oracles go in a `*.test-fixtures.ts` sibling.
- Strict TypeScript. Prefer explicit types over `any`.
- Self-documenting names; comment only non-obvious logic.
- No speculative abstractions, no feature flags, no "simplified for now".
- All code, comments, docs, commits in **English**.

## Package manager

**pnpm only** — never npm, never yarn. Node version from `.nvmrc`.

This is a pnpm **workspace**, so an install at the repo root needs an explicit
flag or pnpm refuses it:

| Where the dependency belongs                           | Command                                 |
| ------------------------------------------------------ | --------------------------------------- |
| Repo root (tooling: eslint, typescript, vitest config) | `pnpm add -Dw <pkg>`                    |
| One package                                            | `pnpm --filter <pkg-name> add -D <pkg>` |

Without `-w` at the root you get `ERR_PNPM_ADDING_TO_ROOT` and nothing is
installed. The guard exists because a dependency added to the root is invisible
to the package that actually imports it, which breaks the build only later, in
CI. Do not silence the warning with `ignore-workspace-root-check`.

`dist/` is gitignored, so a fresh worktree has none. Cross-package imports
(e.g. `packages/mapgen` importing `@freevilisation/engine`) resolve through
`dist/`, not source — run `pnpm run build` right after `pnpm install`, before
`pnpm run test`, or those imports fail with "Failed to resolve entry for
package".

## Testing

- The full suite is `pnpm run test` at the repo root, and only that. **Never
  `pnpm -r test`** — no workspace package defines a `test` script, so a
  recursive run executes nothing and exits 0. It prints "Scope: 7 of 8
  workspace projects" and reads exactly like a green full-suite run.
- Test file basename must match its source file's basename:
  `src/foo/Bar.ts` -> `tests/foo/Bar.test.ts` (per-file coverage gates key on this).
- Coverage targets: pure functions (validators, normalizers, parsers) 100%;
  business logic (services, commands, handlers) >=80%; UI components >=70%.
- A regression test must FAIL when you manually re-apply the bug it claims to
  cover. If it still passes with the bug restored, it is not testing the bug —
  rewrite it to assert the actual observable property, not the absence of a
  signal your method can't see anyway.
- Do not defer tests to a final "write tests" task — write them alongside the
  code in the same task. A final integration/E2E pass on top is fine.

## TypeScript gotchas

- `tsc --noEmit` at the repo root can fail even when a package's own bundler
  build (esbuild/vite/tsup) passes — they run under different `tsconfig`
  settings. Run the root typecheck too; a green package build proves nothing
  about it.
- If a module moves from `x.ts` to `x/index.ts` (or back), `tsc` never deletes
  the orphaned `dist/x.js`, and Node's resolution can silently prefer the
  stale sibling file over the new directory — no build error, just old code
  running. `rm -rf dist` before the next build whenever a file becomes a
  directory or vice versa.
- Prefer `globalThis.x` over `global.x` in test code that might run outside
  Node's global scope.
- Comparing timestamps requires the same unit on both sides — an ISO-8601
  string compared against Unix-ms with `>=` silently evaluates to `NaN >=
number` (always `false`), which looks like "no data" rather than a type
  error. Normalize both sides to ms first.

## Commits

Conventional Commits: `<type>(<scope>): <subject>`, subject ≤ 50 chars,
imperative, no period. Types: feat, fix, docs, style, refactor, test, chore,
perf. **Never add AI attribution** (no `Co-Authored-By: Claude`, no
"Generated by AI").

The active agent is the implementation agent. Implement the tasks from
`.plan/` sequentially to completion, using the approved plan as the source of
truth. Create a Conventional Commit after every completed plan task (at
minimum, after every task belonging to an epic). Do not leave completed plan
work uncommitted.

## Done means verified

A task is done when its acceptance criteria are met AND you have run the
verify commands listed in `TASK.md` and seen them pass. A green build is
necessary, never sufficient. Report failures honestly — do not claim success
you did not observe.
