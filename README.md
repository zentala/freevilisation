# Freevilisation

A browser-based, turn-based 4X strategy game in TypeScript. AGPL-3.0.

## Status

Early scaffold — no gameplay yet.


This    line   is deliberately   mis-formatted to trip the prettier gate.

## Repo layout

```
packages/
  engine/     pure deterministic game rules and state
  content/    game data: units, buildings, techs, terrain
  protocol/   client/server message types
  mapgen/     map generation
  ai/         computer players
apps/
  client/     Vite + React + react-three-fiber browser client
  server/     Cloudflare Worker multiplayer server
tools/        build and dev tooling (empty for now)
```

## Getting started

**Prerequisites:** Node 22 (see `.nvmrc`), pnpm 11+.

```bash
pnpm install
pnpm build
```

Build before you test. Packages import each other through their `exports`
field, which points at a gitignored `dist/`, so `pnpm test` on a fresh clone
fails to resolve `@freevilisation/engine` until the workspace is built. If a
build looks like it did nothing, run `pnpm clean` first — `tsc --build` trusts
its `*.tsbuildinfo` and skips work even when `dist/` is gone.

### Scripts

| Script           | What it does                             |
| ---------------- | ---------------------------------------- |
| `pnpm build`     | TypeScript project build (`tsc --build`) |
| `pnpm typecheck` | Type-check all packages (`tsc --build`)  |
| `pnpm lint`      | ESLint across the monorepo               |
| `pnpm test`      | Run tests with Vitest                    |
| `pnpm clean`     | Clean TypeScript build output            |

## Architecture

The engine in `packages/engine` is pure and deterministic: no DOM, no `Date`,
no `Math.random` — seeded RNG only. Same seed plus same command list always
produces the same state. Every `GameState` mutation is a serializable Command,
never a direct mutation. Game content (units, buildings, techs, terrain) is
data, not code, validated at the boundary where it enters the engine (see
[ADR 019](.plan/ADR/019-validation-boundaries-no-zod-in-engine.md) — the engine
itself carries no runtime dependencies). Package dependency directions are
enforced by ESLint.

Conventions every contributor and agent is expected to follow — build order,
hex geometry, command validation, determinism — are in
[CLAUDE.md](CLAUDE.md). CI quality gates and what blocks a merge to `main`
are in [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0. See [LICENSE](LICENSE).
