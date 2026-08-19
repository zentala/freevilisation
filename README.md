# Freevilisation

A browser-based, turn-based 4X strategy game in TypeScript. AGPL-3.0.

## Status

Early scaffold — no gameplay yet.

## Repo layout

```
packages/
  engine/     pure deterministic game rules and state
  content/    game data: units, buildings, techs, terrain (zod schemas)
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
```

### Scripts

| Script | What it does |
|---|---|
| `pnpm build` | TypeScript project build (`tsc --build`) |
| `pnpm typecheck` | Type-check all packages (`tsc --build`) |
| `pnpm lint` | ESLint across the monorepo |
| `pnpm test` | Run tests with Vitest |
| `pnpm clean` | Clean TypeScript build output |

## Architecture

The engine in `packages/engine` is pure and deterministic: no DOM, no `Date`,
no `Math.random` — seeded RNG only. Same seed plus same command list always
produces the same state. Every `GameState` mutation is a serializable Command,
never a direct mutation. Game content (units, buildings, techs, terrain) is
zod-validated data, not code. Package dependency directions are enforced by
ESLint.

## License

AGPL-3.0. See [LICENSE](LICENSE).
