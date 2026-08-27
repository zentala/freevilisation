import type { DefId } from "./ids.js";

// TODO(E26): replace with packages/content's validated def types
export interface UnitDef {
  id: DefId<"unit">;
}

// TODO(E26): replace with packages/content's validated def types
export interface BuildingDef {
  id: DefId<"building">;
}

// TODO(E26): replace with packages/content's validated def types
export interface TerrainDef {
  id: DefId<"terrain">;
}

// TODO(E26): replace with packages/content's validated def types
export interface TechDef {
  id: DefId<"tech">;
}

// TODO(E26): replace with packages/content's validated def types
export interface CivDef {
  id: DefId<"civ">;
  /** Primary color used to identify this civilization in the renderer. */
  readonly colorHex?: string;
}

export class Registry {
  readonly units: Map<DefId, UnitDef>;
  readonly buildings: Map<DefId, BuildingDef>;
  readonly terrains: Map<DefId, TerrainDef>;
  readonly techs: Map<DefId, TechDef>;
  readonly civs: Map<DefId, CivDef>;

  private constructor(
    units: Map<DefId, UnitDef>,
    buildings: Map<DefId, BuildingDef>,
    terrains: Map<DefId, TerrainDef>,
    techs: Map<DefId, TechDef>,
    civs: Map<DefId, CivDef>,
  ) {
    this.units = units;
    this.buildings = buildings;
    this.terrains = terrains;
    this.techs = techs;
    this.civs = civs;
  }

  static load(defs: {
    units: UnitDef[];
    buildings: BuildingDef[];
    terrains: TerrainDef[];
    techs: TechDef[];
    civs: CivDef[];
  }): Registry {
    const units = new Map<DefId, UnitDef>(defs.units.map((d) => [d.id, d]));
    const buildings = new Map<DefId, BuildingDef>(defs.buildings.map((d) => [d.id, d]));
    const terrains = new Map<DefId, TerrainDef>(defs.terrains.map((d) => [d.id, d]));
    const techs = new Map<DefId, TechDef>(defs.techs.map((d) => [d.id, d]));
    const civs = new Map<DefId, CivDef>(defs.civs.map((d) => [d.id, d]));

    const registry = new Registry(units, buildings, terrains, techs, civs);
    return Object.freeze(registry) as Registry;
  }
}
