# Freevilisation — orchestration-linked tasks

Ten plik zawiera wyłącznie zadania integracyjne związane z Agent Orchestration
System. Właściwe zadania produktu pozostają w `freevilisation/.plan/` oraz w KB.

Centralny board: `agent-orchestration-system/BOARD.md` —
`C:\Users\zentala\.codex\projects\agent-orchestration-system\BOARD.md`.

Centralny handoff retry: `agent-orchestration-system/handoffs/H-E06-T15-RETRY.md` —
`C:\Users\zentala\.codex\projects\agent-orchestration-system\handoffs\H-E06-T15-RETRY.md`.

## Current recovery

- [ ] ORCH-FV-001 — Udostępnić czysty, aktualny `freevilisation/main` do audytowanego
      retry `freevilisation:E08-W5-T3`; nie wykonywać ręcznych zmian statusu ani fałszywego
      `tasks.json`.
- [ ] ORCH-FV-002 — Po udanym retry zweryfikować build, lint, typecheck, format, testy,
      commit/merge SHA, KB completion i ledger SQLite.
- [ ] ORCH-FV-003 — Dopiero po ORCH-FV-002 uruchomić kontrolowaną falę maksymalnie 10
      gotowych tasków przez `dispatch.internal`; bez `--unattended` i bez overnightu.

## Known blocker

- [ ] ORCH-FV-004 — `freevilisation:E10-W6-T13` pozostaje `manifest_blocked`, ponieważ
      zależy od wyłączonego lokalnego E06; nie dispatchować go do czasu jawnego rozwiązania.

## Ownership and plan relocation

- [ ] ORCH-FV-005 — Nie przenosić planów systemowych do Freevilisation. Ten plik jest
      lokalnym indeksem integracji; szczegóły runtime należą do `dispatch.internal`, a
      kontrakty i completion do `kb-mcp`.
