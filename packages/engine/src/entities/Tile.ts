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
  /**
   * River flags for the three edges this tile owns (directions 0, 1, 2).
   * The other three edges belong to a neighbour — read them with
   * `hasRiverEdge(map, coord, direction)`, never off this tile directly.
   * See DATA-MODEL.md "River edges" and ADR-026.
   */
  riverEdge0: boolean;
  riverEdge1: boolean;
  riverEdge2: boolean;
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
    riverEdge0: boolean,
    riverEdge1: boolean,
    riverEdge2: boolean,
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
    this.riverEdge0 = riverEdge0;
    this.riverEdge1 = riverEdge1;
    this.riverEdge2 = riverEdge2;
    this.ownerCity = ownerCity;
    this.ownerPlayer = ownerPlayer;
    this.workedByCity = workedByCity;
    this.occupantUnitIds = occupantUnitIds;
  }
}
