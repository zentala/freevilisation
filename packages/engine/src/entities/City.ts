import type {
  EntityId,
  HexKey,
  PlayerId,
  BuildingDefId,
  WonderDefId,
} from "../ids.js";
import { Entity } from "./Entity.js";

export class City extends Entity {
  override readonly ownerId: PlayerId;
  readonly foundedTurn: number;
  readonly centerTile: HexKey;
  name: string;
  population: number;
  foodStock: number;
  productionStock: number;
  workedTiles: HexKey[];
  claimedTiles: HexKey[];
  buildings: BuildingDefId[];
  wonders: WonderDefId[];
  health: number;
  defenseStrength: number;
  isCapital: boolean;

  constructor(
    id: EntityId,
    createdTurn: number,
    ownerId: PlayerId,
    foundedTurn: number,
    centerTile: HexKey,
    name: string,
    population: number,
    foodStock: number,
    productionStock: number,
    workedTiles: HexKey[],
    claimedTiles: HexKey[],
    buildings: BuildingDefId[],
    wonders: WonderDefId[],
    health: number,
    defenseStrength: number,
    isCapital: boolean,
  ) {
    super(id, "city", ownerId, createdTurn);
    this.ownerId = ownerId;
    this.foundedTurn = foundedTurn;
    this.centerTile = centerTile;
    this.name = name;
    this.population = population;
    this.foodStock = foodStock;
    this.productionStock = productionStock;
    this.workedTiles = workedTiles;
    this.claimedTiles = claimedTiles;
    this.buildings = buildings;
    this.wonders = wonders;
    this.health = health;
    this.defenseStrength = defenseStrength;
    this.isCapital = isCapital;
  }
}
