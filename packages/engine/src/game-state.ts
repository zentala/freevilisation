import type { EntityId, PlayerId, UnitId, CityId, HexKey, DefId } from "./ids.js";
import type { Unit } from "./entities/Unit.js";
import type { City } from "./entities/City.js";
import type { Player } from "./entities/Player.js";
import type { Tile } from "./entities/Tile.js";
import type { Registry } from "./registry.js";
import { createPrng, type RngState } from "./prng.js";

export interface GameMap {
  readonly width: number;
  readonly height: number;
  readonly isWraparoundX: boolean;
  tiles: Record<HexKey, Tile>;
}

export interface EntityStores {
  units: Record<UnitId, Unit>;
  cities: Record<CityId, City>;
}

export interface GameSettings {
  mapSeed: number;
  mapSize: "tiny" | "small" | "standard" | "large" | "huge";
  victoryConditions: DefId<"victory">[];
  difficulty: DefId<"difficulty">;
  turnTimerSeconds: number | null;
  simultaneousTurns: boolean;
}

export type GamePhase = "setup" | "playing" | "turn_resolution" | "game_over";
export type Era = "Ancient" | "Classical" | "Medieval";

export interface RulesetRef {
  readonly id: string;
  readonly version: string;
  readonly contentHash: string;
}

export interface GameState {
  readonly gameId: EntityId;
  turn: number;
  phase: GamePhase;
  era?: Era;
  activePlayerId: PlayerId | null;
  players: Record<PlayerId, Player>;
  playerOrder: PlayerId[];
  map: GameMap;
  entities: EntityStores;
  rngState: RngState;
  rulesetRef: RulesetRef;
  settings: GameSettings;
  nextEntitySeq: number;
  winnerPlayerId: PlayerId | null;
  victoryType: DefId<"victory"> | null;
}

const MAP_SIZES: Record<GameSettings["mapSize"], { w: number; h: number }> = {
  tiny: { w: 20, h: 20 },
  small: { w: 30, h: 30 },
  standard: { w: 44, h: 44 },
  large: { w: 60, h: 60 },
  huge: { w: 80, h: 80 },
};

/**
 * `rulesetRef` is a standalone parameter (not nested in `settings`) to keep
 * this function under 50 lines — it derives from `registry` and is not
 * architecturally coupled to `GameSettings`.
 */
export function createInitialGameState(
  seed: number,
  settings: GameSettings,
  registry: Registry,
  rulesetRef: RulesetRef,
): GameState {
  const { w, h } = MAP_SIZES[settings.mapSize];
  const rngState = createPrng(seed).state();

  return {
    gameId: `ent_000000` as EntityId,
    turn: 0,
    phase: "setup",
    era: "Ancient",
    activePlayerId: null,
    players: {},
    playerOrder: [],
    map: { width: w, height: h, isWraparoundX: false, tiles: {} },
    entities: { units: {}, cities: {} },
    rngState,
    rulesetRef,
    settings,
    nextEntitySeq: 0,
    winnerPlayerId: null,
    victoryType: null,
  };
}
