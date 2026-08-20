import type { EntityId, HexKey, UnitDefId, PlayerId, DefId } from "../ids.js";
import { Entity } from "./Entity.js";

export class Unit extends Entity {
  readonly defId: UnitDefId;
  override readonly ownerId: PlayerId;
  coord: HexKey; // TODO(E03): replace with AxialCoord
  hp: number;
  movesLeft: number;
  movesMax: number;
  promotions: DefId<"promotion">[];
  experience: number;
  fortifiedTurns: number;
  isEmbarked: boolean;

  constructor(
    id: EntityId,
    createdTurn: number,
    defId: UnitDefId,
    ownerId: PlayerId,
    coord: HexKey,
    hp: number,
    movesLeft: number,
    movesMax: number,
    promotions: DefId<"promotion">[],
    experience: number,
    fortifiedTurns: number,
    isEmbarked: boolean,
  ) {
    super(id, "unit", ownerId, createdTurn);
    this.defId = defId;
    this.ownerId = ownerId;
    this.coord = coord;
    this.hp = hp;
    this.movesLeft = movesLeft;
    this.movesMax = movesMax;
    this.promotions = promotions;
    this.experience = experience;
    this.fortifiedTurns = fortifiedTurns;
    this.isEmbarked = isEmbarked;
  }
}
