# Branch protection for `main`

## Current state: NOT enabled

`main` has no branch protection today. A commit that fails every check in
`.github/workflows/ci.yml` can still land, because nothing requires the
checks to pass first. Turning protection on is deliberately deferred — see
`.plan/BACKLOG.md`, the entry starting "`main` has no branch protection, so a
red commit lands unnoticed" (Importance: Medium, Points: 8). The reason:
requiring status checks forces
every commit through a pull request, which means adopting a `dev` -> `main`
flow and rewriting the merge instructions across the plan
(`ORCHESTRATOR.md` execution rules, each epic's wave-merge step, the
worktree conventions). The owner has not made that call yet, so this
document is the settings to apply **when** that decision is made, not a
record of what is live.

This file exists to satisfy ADR-013's reference to it and to remove the
guesswork the next time protection is turned on.

## Settings to apply, in the GitHub UI

Repo -> Settings -> Branches -> Add branch protection rule (or edit the
rule for `main` if one already exists).

- **Branch name pattern**: `main`
- **Require a pull request before merging**: on
  - **Require approvals**: 0 (single-maintainer repo today; the owner
    self-merges after CI is green). Raise to 1+ once a second maintainer
    joins.
  - **Dismiss stale pull request approvals when new commits are pushed**: on
- **Require status checks to pass before merging**: on
  - **Require branches to be up to date before merging**: on
  - **Status checks that are required** — every job name below, exactly as
    it appears as a `jobs.<id>` key in `.github/workflows/ci.yml`:
    - `format`
    - `typecheck`
    - `lint`
    - `commitlint`
    - `test`
    - `determinism`
    - `coverage`
    - `size-limit`
    - `preview-deploy`
- **Require conversation resolution before merging**: on
- **Do not allow bypassing the above settings**: on (includes the repo
  owner — no admin override, per ADR-013's "no exceptions, no override")
- **Allow force pushes**: off
- **Allow deletions**: off

Do not enable "Require signed commits" or CODEOWNERS review gating as part
of this change — neither is part of E43's scope.

## Direct pushes to `main`

With "Require a pull request before merging" on, GitHub already rejects a
direct `git push` to `main` from anyone, including the owner, once
"Do not allow bypassing the above settings" is also on. No separate ruleset
is needed to block direct pushes — it is a consequence of the settings
above, not an additional toggle.

## Keeping this list in sync

The required-checks list above is a snapshot of `ci.yml`'s job names. If a
job is renamed or a new PR-blocking job is added, update both this list and
the GitHub branch protection rule in the same change — a required check
that no longer exists shows as permanently pending in the GitHub UI and
blocks every PR.
