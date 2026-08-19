export const ENGINE_PACKAGE = "@freevilisation/engine" as const;

export type {
  EntityId,
  PlayerId,
  UnitId,
  CityId,
  TileId,
  DefId,
  TerrainDefId,
  FeatureDefId,
  ResourceDefId,
  ImprovementDefId,
  UnitDefId,
  BuildingDefId,
  WonderDefId,
  TechDefId,
  CivDefId,
  PolicyDefId,
  HexKey,
} from "./ids.js";

export { makeEntityId } from "./ids.js";

export {
  Entity,
  Tile,
  Unit,
  City,
  Building,
  Player,
} from "./entities/index.js";

export type { EntityType, ComponentKey } from "./entities/index.js";

export { Registry } from "./registry.js";
export type {
  UnitDef,
  BuildingDef,
  TerrainDef,
  TechDef,
  CivDef,
} from "./registry.js";

export { EntityStore } from "./entity-store.js";

export { createPrng, restorePrng } from "./prng.js";
export type { Prng, RngState } from "./prng.js";

export { createInitialGameState } from "./game-state.js";
export type {
  GameMap,
  EntityStores,
  GameSettings,
  GamePhase,
  GameState,
  RulesetRef,
} from "./game-state.js";

export { serialize, deserialize, stateHash } from "./serialization.js";
