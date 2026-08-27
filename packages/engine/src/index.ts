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

export { serialize, deserialize, stateHash } from "./serialization/index.js";

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

export { advancePhase, TURN_PHASES } from "./turn/phases.js";
export type { TurnPhase } from "./turn/phases.js";
export { runUpkeep } from "./turn/upkeep.js";
export type { UpkeepRules, UpkeepResult } from "./turn/upkeep.js";
export { runGrowthProduction } from "./turn/growth-production.js";
export type {
  CityTickResult,
  GrowthProductionResult,
  GrowthProductionRules,
  ProductionCompletion,
  ProductionKind,
} from "./turn/growth-production.js";

export type { AxialCoord } from "./hex/coords.js";
export { cubeS, toHexKey, fromHexKey, coordsEqual } from "./hex/coords.js";

export {
  AXIAL_DIRECTIONS,
  OWNED_EDGE_DIRECTIONS,
  neighbor,
  neighbors,
  distance,
  ring,
  range,
  line,
} from "./hex/hex-math.js";

export type { WrapContext } from "./hex/hex-math.js";
export { wrapQ } from "./hex/hex-math.js";

export { CHUNK_SIZE, toChunkKey, fromChunkKey, chunkTiles, chunksInRadius } from "./hex/chunk.js";

export type { TileFactory } from "./hex/game-map.js";
export { buildGameMap, getTile, hasTile, toWrapContext } from "./hex/game-map.js";

export type { IsPassable, CostFn } from "./hex/graph.js";
export { neighborsOf, edgeCost } from "./hex/graph.js";

export { hasRiverEdge } from "./hex/river-edges.js";

export {
  canSpendMovement,
  createMovementBudget,
  findPath,
  spendMovement,
} from "./movement/index.js";
export type { MovementBudget, MovementPoints } from "./movement/index.js";
