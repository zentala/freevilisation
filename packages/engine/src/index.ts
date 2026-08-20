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
  ChunkKey,
} from "./ids.js";

export { makeEntityId } from "./ids.js";

export { Entity, Tile, Unit, City, Building, Player } from "./entities/index.js";

export type { EntityType, ComponentKey } from "./entities/index.js";

export { Registry } from "./registry.js";
export type { UnitDef, BuildingDef, TerrainDef, TechDef, CivDef } from "./registry.js";

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

export { validate, applyCommand } from "./commands/pipeline.js";
export type { Command, GameEvent, CommandResult, CommandRejection } from "./commands/types.js";

export { EventBus } from "./event-bus.js";
export type { EventListener } from "./event-bus.js";

export { GameSession } from "./game-session.js";

export { refreshUnitMoves } from "./systems/refresh-unit-moves.js";
export type { TurnSystem } from "./systems/refresh-unit-moves.js";

export { replay, assertDeterministic } from "./testing/determinism-harness.js";
export type { DeterminismRun } from "./testing/determinism-harness.js";

export { assertInvariants } from "./invariants.js";

export type { AxialCoord } from "./hex/coords.js";
export { cubeS, toHexKey, fromHexKey, coordsEqual } from "./hex/coords.js";

export {
  AXIAL_DIRECTIONS,
  neighbor,
  neighbors,
  distance,
  ring,
  range,
  line,
} from "./hex/hex-math.js";

export type { WrapContext } from "./hex/hex-math.js";
export { wrapQ } from "./hex/hex-math.js";

export {
  CHUNK_SIZE,
  toChunkKey,
  fromChunkKey,
  chunkTiles,
  chunksInRadius,
} from "./hex/chunk.js";
