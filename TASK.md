---
points: 10
taskKind: config
gate: lint
---

# E43-W1 — Commit & PR hygiene (10 SP)

## TLDR

Four pieces of process scaffolding, all config and prose, no product code:
Prettier with a `format` CI job, commitlint with a CI job, a pull-request
template, and a `CODEOWNERS` file. Nothing here may change how the existing
`typecheck` / `lint` / `test` jobs behave.

## Read before you write anything

- `package.json` at the repo root — the workspace root. Scripts live here:
  `build`, `typecheck`, `lint`, `test`, `clean`. You add `format` and
  `format:check`.
- `.github/workflows/ci.yml` — three jobs today (`typecheck`, `lint`,
  `test`), each with the identical five-step shape: checkout,
  `pnpm/action-setup@v4`, `actions/setup-node@v4` with
  `node-version-file: .nvmrc` and `cache: pnpm`, `pnpm install
--frozen-lockfile`, then one `pnpm run …`. **Copy that shape exactly** for
  the new jobs. Do not restructure the file, do not add a matrix, do not
  extract a composite action.
- `pnpm-workspace.yaml`, `packages/` (`ai`, `content`, `engine`, `mapgen`,
  `protocol`) and `apps/` (`client`, `server`) — the layout `CODEOWNERS`
  describes.
- `eslint.config.*` — Prettier must not fight ESLint. Formatting rules stay
  out of ESLint; ESLint keeps the correctness and boundary rules it has.

Package manager is **pnpm 11.3.0**. Node `>=22`. ESM (`"type": "module"`).
Never run `npm` or `yarn`.

## T1 — Prettier + `format` CI job (3 SP)

- Add `prettier` to the **root** `devDependencies` via
  `pnpm add -D -w prettier`. This is the one task in this epic where adding a
  dependency is correct.
- `.prettierrc.json` at the repo root. Keep it small and boring — the point
  is one answer, not a house style debate:

  ```json
  {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```

- `.prettierignore`: `node_modules`, `dist`, `build`, `coverage`,
  `pnpm-lock.yaml`, `.plan`, and any generated output you find in
  `.gitignore`. `.plan` is untracked here but ignore it anyway.
- Root scripts: `"format": "prettier --write ."` and
  `"format:check": "prettier --check ."`.
- **Run `pnpm run format` once and commit the reformat.** A `--check` job
  added to a repo that has never been formatted is red on arrival. The
  reformat commit may be large; that is expected and it is fine.
- New `format` job in `ci.yml` running `pnpm run format:check`, same five-step
  shape as the others.

## T2 — commitlint + CI job (3 SP)

- `pnpm add -D -w @commitlint/cli @commitlint/config-conventional`.
- `commitlint.config.js` at the root, ESM (`export default`, not
  `module.exports` — the root package is `"type": "module"` and a CommonJS
  config will fail to load):

  ```javascript
  export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
      "type-enum": [
        2,
        "always",
        ["feat", "fix", "docs", "style", "refactor", "test", "chore", "perf"],
      ],
      "subject-max-length": [2, "always", 50],
      "subject-full-stop": [2, "never", "."],
    },
  };
  ```

- New `commitlint` job in `ci.yml`. On a pull request it must validate **every
  commit in the PR**, not just the tip. That needs full history, so this job's
  checkout step differs from the others:

  ```yaml
  - uses: actions/checkout@v4
    with:
      fetch-depth: 0
  ```

  and then lint the range:

  ```yaml
  - run: pnpm exec commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
    if: github.event_name == 'pull_request'
  ```

  Guard it with that `if:` so a push to `main` does not fail the job with an
  empty range.

- No git hooks. Do not install husky, lefthook, or anything that writes to
  `.git/hooks` — this task gates in CI only.

## T3 — `.github/PULL_REQUEST_TEMPLATE.md` (2 SP)

Short, three sections, no ceremony:

- **Summary** — what changed and why, in plain sentences.
- **Epic / task** — the ID, e.g. `E03-W2`, and a one-line scope statement.
- **Testing done** — the exact commands run and their result
  (`pnpm run typecheck`, `pnpm run lint`, `pnpm run test`, with the test
  count). A checkbox list is fine; a checkbox that says "I tested it" with no
  command is not.

Write it in English, in the plain style the rest of the repo's docs use. No
emoji, no "🎉", no badge table.

## T4 — `.github/CODEOWNERS` (2 SP)

Single owner, `@zentala`, for everything today — the file exists so the map
is written down before there is a second contributor, not to route reviews
now.

```
*                       @zentala
/packages/engine/       @zentala
/packages/mapgen/       @zentala
/packages/protocol/     @zentala
/packages/content/      @zentala
/packages/ai/           @zentala
/apps/client/           @zentala
/apps/server/           @zentala
/.github/               @zentala
```

Do not list `.plan/` — it is untracked and a CODEOWNERS entry for a path git
does not track is dead text.

## Out of scope — do not touch

- Coverage thresholds, `size-limit`, bundle budgets (that is E43-W2).
- The determinism job, preview deploys, branch-protection docs (E43-W3).
- Any file under `packages/` or `apps/` **other than** whatever
  `pnpm run format` reformats. No logic changes anywhere, ever, in this task.
- The existing `typecheck` / `lint` / `test` jobs — leave them byte-identical.

## Verify — run all of these, paste the output into FEEDBACK.md

```
pnpm install
pnpm run format:check   # must exit 0 (run `pnpm run format` first and commit it)
pnpm run lint           # must exit 0
pnpm run typecheck      # must exit 0
pnpm run test           # must exit 0, count must still be at least 129
pnpm exec commitlint --from HEAD~1 --to HEAD --verbose   # exercises the config on a real commit
```

The test count must not drop. If formatting broke a test, fix the formatting
config, never the test.

Also check the workflow file parses — every job you added has `runs-on`,
`steps`, and correct indentation. A YAML typo here fails on GitHub, where you
cannot see it, so read it back before committing.

## Definition of done

- `.prettierrc.json`, `.prettierignore`, `commitlint.config.js`,
  `.github/PULL_REQUEST_TEMPLATE.md`, `.github/CODEOWNERS` all exist.
- Root `package.json` has `format` and `format:check` scripts and the three
  new devDependencies; `pnpm-lock.yaml` is updated in the same commit.
- `ci.yml` has `format` and `commitlint` jobs, and the three original jobs are
  unchanged.
- The repo is fully formatted — `pnpm run format:check` exits 0.
- `pnpm run test` still reports at least 129 tests.
- `FEEDBACK.md` at the repo root: what was unclear, what you had to guess,
  what fought you. Write it even if the run was clean.
