declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type EntityId = Brand<string, "EntityId">;
export type PlayerId = Brand<string, "PlayerId">;
export type UnitId = Brand<EntityId, "UnitId">;
export type CityId = Brand<EntityId, "CityId">;
export type TileId = Brand<EntityId, "TileId">;

export type DefId<Kind extends string = string> = Brand<string, `DefId:${Kind}`>;
export type TerrainDefId = DefId<"terrain">;
export type FeatureDefId = DefId<"feature">;
export type ResourceDefId = DefId<"resource">;
export type ImprovementDefId = DefId<"improvement">;
export type UnitDefId = DefId<"unit">;
export type BuildingDefId = DefId<"building">;
export type WonderDefId = DefId<"wonder">;
export type TechDefId = DefId<"tech">;
export type CivDefId = DefId<"civ">;
export type PolicyDefId = DefId<"policy">;

export type HexKey = Brand<string, "HexKey">;
export type ChunkKey = Brand<string, "ChunkKey">;

/**
 * Builds an entity id from a sequence number owned by the caller.
 *
 * The engine must be deterministic: the same command log replayed on any
 * machine must produce identical ids. So this function holds no state and
 * reads no clock — the monotonic counter lives in GameState, which is
 * serialized with the rest of the game.
 */
export function makeEntityId(seq: number): EntityId {
  return `ent_${seq.toString(36).padStart(6, "0")}` as EntityId;
}
