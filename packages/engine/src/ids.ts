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

// Engine-internal exception: IDs are generated once at creation time and
// never reused. Monotonic counter + timestamp is acceptable here even though
// the rest of the package bans Date/Math.random (determinism only matters
// for gameplay commands, not for unique identity generation).
let counter = 0;
export function createEntityId(): EntityId {
  const ts = Date.now().toString(36);
  const seq = (counter++).toString(36).padStart(4, "0");
  return `ent_${ts}${seq}` as EntityId;
}
