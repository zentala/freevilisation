import type { EntityId, HexKey, PlayerId } from "./ids.js";
import type { Entity } from "./entities/Entity.js";

/**
 * Returns the hex an entity stands on, or `undefined` for entity types with
 * no map position. `atHex()` exists to answer "what stands on this tile" —
 * that means tiles themselves, units occupying a tile, and cities centred
 * on one all belong in the spatial index, not tiles alone.
 */
function spatialKey(entity: Entity): HexKey | undefined {
  switch (entity.type) {
    case "tile":
      return (entity as unknown as { hexKey: HexKey }).hexKey;
    case "unit":
      return (entity as unknown as { coord: HexKey }).coord;
    case "city":
      return (entity as unknown as { centerTile: HexKey }).centerTile;
    default:
      return undefined;
  }
}

/**
 * In-memory index over the engine's entities: by id, by hex (units, cities
 * and tiles), and by owning player.
 *
 * Entities that move (a `Unit`'s `coord` changes in place) do not update
 * the spatial index automatically. To relocate an entity, call `remove(id)`
 * then `add(entity)` again with its new position — that is the only
 * supported way to keep `atHex()` in sync with a move.
 */
export class EntityStore {
  private byId: Map<EntityId, Entity>;
  private spatialIndex: Map<HexKey, EntityId[]>;
  private byOwner: Map<PlayerId, Set<EntityId>>;

  constructor() {
    this.byId = new Map();
    this.spatialIndex = new Map();
    this.byOwner = new Map();
  }

  get(id: EntityId): Entity | undefined {
    return this.byId.get(id);
  }

  add(entity: Entity): void {
    this.byId.set(entity.id, entity);
    const hex = spatialKey(entity);
    if (hex !== undefined) {
      const ids = this.spatialIndex.get(hex) ?? [];
      ids.push(entity.id);
      this.spatialIndex.set(hex, ids);
    }
    if (entity.ownerId != null) {
      const ownerIds = this.byOwner.get(entity.ownerId) ?? new Set();
      ownerIds.add(entity.id);
      this.byOwner.set(entity.ownerId, ownerIds);
    }
  }

  remove(id: EntityId): void {
    const entity = this.byId.get(id);
    if (entity == null) return;
    this.byId.delete(id);
    const hex = spatialKey(entity);
    if (hex !== undefined) {
      const ids = this.spatialIndex.get(hex);
      if (ids != null) {
        const idx = ids.indexOf(id);
        if (idx !== -1) ids.splice(idx, 1);
        if (ids.length === 0) this.spatialIndex.delete(hex);
      }
    }
    if (entity.ownerId != null) {
      const ownerIds = this.byOwner.get(entity.ownerId);
      ownerIds?.delete(id);
    }
  }

  atHex(coord: HexKey): Entity[] {
    const ids = this.spatialIndex.get(coord) ?? [];
    return ids.map((id) => this.byId.get(id)).filter((e): e is Entity => e != null);
  }

  ofOwner(playerId: PlayerId): Entity[] {
    const ids = this.byOwner.get(playerId);
    if (ids == null) return [];
    return [...ids].map((id) => this.byId.get(id)).filter((e): e is Entity => e != null);
  }
}
