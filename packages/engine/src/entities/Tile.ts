import type {
  EntityId,
  HexKey,
  TerrainDefId,
  FeatureDefId,
  ResourceDefId,
  ImprovementDefId,
  CityId,
  UnitId,
  PlayerId,
} from "../ids.js";
import { Entity } from "./Entity.js";

export class Tile extends Entity {
  hexKey: HexKey;
  terrainDefId: TerrainDefId;
  featureDefId: FeatureDefId | null;
  resourceDefId: ResourceDefId | null;
  improvementDefId: ImprovementDefId | null;
  hasRiver: boolean;
  ownerCity: CityId | null;
  ownerPlayer: PlayerId | null;
  workedByCity: CityId | null;
  occupantUnitIds: UnitId[];

  constructor(
    id: EntityId,
    createdTurn: number,
    hexKey: HexKey,
    terrainDefId: TerrainDefId,
    featureDefId: FeatureDefId | null,
    resourceDefId: ResourceDefId | null,
    improvementDefId: ImprovementDefId | null,
    hasRiver: boolean,
    ownerCity: CityId | null,
    ownerPlayer: PlayerId | null,
    workedByCity: CityId | null,
    occupantUnitIds: UnitId[],
  ) {
    super(id, "tile", ownerPlayer, createdTurn);
    this.hexKey = hexKey;
    this.terrainDefId = terrainDefId;
    this.featureDefId = featureDefId;
    this.resourceDefId = resourceDefId;
    this.improvementDefId = improvementDefId;
    this.hasRiver = hasRiver;
    this.ownerCity = ownerCity;
    this.ownerPlayer = ownerPlayer;
    this.workedByCity = workedByCity;
    this.occupantUnitIds = occupantUnitIds;
  }
}
