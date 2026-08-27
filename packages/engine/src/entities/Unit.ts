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
  /** Remaining destination steps for a move order paused at turn boundary. */
  moveOrder: HexKey[];

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
    moveOrder: HexKey[] = [],
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
    this.moveOrder = [...moveOrder];
  }
}
