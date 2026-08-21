# Working in this repo

Instructions for AI agents and for anyone new to the codebase. Short on
purpose: these are the rules that have already been broken once and cost
real time. Everything else lives in the design documents.

## Build before you test

Packages import each other through their `exports` field, which points at a
gitignored `dist/`. `vitest` therefore cannot resolve `@freevilisation/engine`
from `@freevilisation/mapgen` until the workspace is built.

```bash
pnpm install
pnpm run build      # tsc --build — required before the next line
pnpm run test
```

If `pnpm run build` prints nothing and produces no `dist/`, it decided the
build was up to date from a stale `*.tsbuildinfo`. `tsc --build` never
deletes orphaned output and never notices that you removed `dist/` by hand:

```bash
pnpm run clean      # tsc --build --clean
pnpm run build
```

This is not a footnote. CI ran red for three pushes because the `test` job
installed and ran `vitest` without building, and every failure read as
"Failed to resolve entry for package @freevilisation/engine".

## Hex geometry comes from the engine — always

`@freevilisation/engine` owns hex math (ADR-017). Never hand-roll neighbour
offsets, distance or ring logic anywhere else, in any package.

```ts
// wrong — this is a square grid wearing hex coordinate names
const NEIGHBORS = [[0, -1], [0, 1], [-1, 0], [1, 0]];
const dist = Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r));

// right
import { neighbors, distance, ring, toWrapContext } from "@freevilisation/engine";
```

The failure mode is silent: four-offset neighbours and Chebyshev distance
produce plausible-looking maps in which tiles two hexes apart count as
adjacent and real axial neighbours are never visited. `packages/mapgen`
shipped three stages that way before anyone noticed.

Map wraparound is part of the geometry, not an extra. Take the wrap context
from the map (`toWrapContext(map)`) and pass it to the hex helpers rather
than assuming a flat rectangle.

## Command validation is the game's only guard rail

Every state mutation goes through the command pipeline (ADR-005), and
`validate()` is the only thing standing between a client and an illegal
move. Validate the whole request, not the parts that are easy to check.

A `MoveUnit` command carrying a path was checked for "every hex exists" and
"the path is not longer than the unit's remaining moves" — but never for
whether consecutive hexes are neighbours. A one-element path teleported a
unit across the map for one move point. When you add a command, ask what an
adversarial client could send, and write the test that sends it.

## Determinism is a hard constraint

The engine and mapgen must produce identical results from identical seeds on
every machine. ESLint blocks `Date`, `Math.random`, `window` and `fetch` in
those packages — do not work around it. Randomness comes from the seeded PRNG
(`createPrng`, ADR-016: mulberry32); iteration order over maps and sets must
be made explicit before it affects output.

## Where the truth lives

- **Architecture and decisions** — `.plan/ARCHITECTURE.md` and `.plan/ADR/`.
- **Epic status** — each epic's own `EPIC.md`, plus `.plan/STATE.md` for the
  current wave. `.plan/ORCHESTRATOR.md` carries points and dependencies, not
  status; it drifted for five finished epics before this was separated.
- **Known defects and follow-ups** — `.plan/BACKLOG.md`.
- **Why something was changed after the fact** — `.plan/LESSONS.md`.

`.plan/` is gitignored in this repository and lives in its own private git
repository. If you are working from a public clone, those files are simply
absent — the rules on this page still apply.

## House rules

- Conventional Commits (`feat(scope): subject`, imperative, ≤ 50 chars).
  Never add AI attribution to a commit.
- New file ≤ 250 lines, function ≤ 50 lines.
- Tests live with the change, not in a "write tests" task at the end. A
  regression test must fail when you revert the fix — check that it does.
- Prose in documents and comments: plain words, active voice, no marketing
  adjectives.
