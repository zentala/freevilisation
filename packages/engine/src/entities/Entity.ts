import type { EntityId, PlayerId } from "../ids.js";

export type EntityType = "tile" | "unit" | "city" | "building" | "player";
export type ComponentKey = string;

export abstract class Entity {
  readonly id: EntityId;
  readonly type: EntityType;
  readonly ownerId: PlayerId | null;
  readonly createdTurn: number;
  readonly components: Map<ComponentKey, unknown>;

  protected constructor(
    id: EntityId,
    type: EntityType,
    ownerId: PlayerId | null,
    createdTurn: number,
  ) {
    this.id = id;
    this.type = type;
    this.ownerId = ownerId;
    this.createdTurn = createdTurn;
    this.components = new Map();
  }
}
