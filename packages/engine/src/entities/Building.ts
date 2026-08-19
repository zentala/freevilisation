import type { EntityId, CityId, BuildingDefId } from "../ids.js";
import { Entity } from "./Entity.js";

export class Building extends Entity {
  readonly defId: BuildingDefId;
  cityId: CityId;

  constructor(
    id: EntityId,
    createdTurn: number,
    defId: BuildingDefId,
    cityId: CityId,
  ) {
    super(id, "building", null, createdTurn);
    this.defId = defId;
    this.cityId = cityId;
  }
}
