import type { EntityId, PlayerId, CivDefId, CityId, TechDefId, PolicyDefId } from "../ids.js";
import { Entity } from "./Entity.js";

export class Player extends Entity {
  readonly civDefId: CivDefId;
  readonly isAI: boolean;
  readonly isBarbarian: boolean;
  gold: number;
  goldPerTurn: number;
  researchedTechs: TechDefId[];
  adoptedPolicies: PolicyDefId[];
  culturePerTurn: number;
  cultureStock: number;
  capitalCityId: CityId | null;
  isAlive: boolean;
  eliminatedTurn: number | null;

  constructor(
    id: EntityId,
    createdTurn: number,
    civDefId: CivDefId,
    isAI: boolean,
    isBarbarian: boolean,
    gold: number,
    goldPerTurn: number,
    researchedTechs: TechDefId[],
    adoptedPolicies: PolicyDefId[],
    culturePerTurn: number,
    cultureStock: number,
    capitalCityId: CityId | null,
    isAlive: boolean,
    eliminatedTurn: number | null,
  ) {
    const playerId = id as unknown as PlayerId;
    super(id, "player", playerId, createdTurn);
    this.civDefId = civDefId;
    this.isAI = isAI;
    this.isBarbarian = isBarbarian;
    this.gold = gold;
    this.goldPerTurn = goldPerTurn;
    this.researchedTechs = researchedTechs;
    this.adoptedPolicies = adoptedPolicies;
    this.culturePerTurn = culturePerTurn;
    this.cultureStock = cultureStock;
    this.capitalCityId = capitalCityId;
    this.isAlive = isAlive;
    this.eliminatedTurn = eliminatedTurn;
  }
}
