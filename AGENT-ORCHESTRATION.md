# Freevilisation orchestration plan

This repository owns the Freevilisation product code, product epics, task
bodies and local planning source. It is an integration client of the generic
orchestrator; it does not own Dispatch runtime policy.

Cross-repository coordination board:

- `agent-orchestration-system/BOARD.md` — `C:\Users\zentala\.codex\projects\agent-orchestration-system\BOARD.md`
- `agent-orchestration-system/CODEX.md` — `C:\Users\zentala\.codex\projects\agent-orchestration-system\CODEX.md`
- Communication board — `agent-orchestration-system/COMMUNICATION.md` — `C:\Users\zentala\.codex\projects\agent-orchestration-system\COMMUNICATION.md`

## Current state

- Migration and reconciliation are complete and published as manifest v3.
- 580 task records are accepted; 8 are explicit exclusions.
- `freevilisation:E10-W6-T13` remains blocked by its excluded local E06
  dependency and must not be dispatched manually.
- The first controlled wave stopped after
  `freevilisation:E08-W5-T3` failed without a commit. Its ledger and worktrees
  are preserved for audited recovery.

## Next action

Run the audited single-task recovery using the existing run and ledger. Do not
create a new run, manually change statuses, or start overnight execution.
The exact cross-machine resume document is
`agent-orchestration-system/handoffs/H-E06-SESSION-RESUME.md` —
`C:\Users\zentala\.codex\projects\agent-orchestration-system\handoffs\H-E06-SESSION-RESUME.md`.

## Local communication rule

Product changes remain in this repository. Report task status, source paths,
quality evidence, commits and blockers through the central communication board
and linked handoffs. Do not manually edit KB completion or Dispatch ledger
state.
