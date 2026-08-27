import type { Registry } from "../registry.js";
import type { EntityId, UnitId, CityId, PlayerId, HexKey, DefId } from "../ids.js";
import { Unit } from "../entities/Unit.js";
import { City } from "../entities/City.js";
import { Player } from "../entities/Player.js";
import { Tile } from "../entities/Tile.js";
import { asNum, asBool, assertKnownDefId, type PlainEntity } from "./validate.js";

export function reviveUnit(p: PlainEntity, registry: Registry): Unit {
  assertKnownDefId(p.defId as DefId, registry.units, "unit.defId");
  return new Unit(
    p.id as EntityId,
    asNum(p.createdTurn, "unit.createdTurn"),
    p.defId as never,
    p.ownerId as PlayerId,
    p.coord as HexKey,
    asNum(p.hp, "unit.hp"),
    asNum(p.movesLeft, "unit.movesLeft"),
    asNum(p.movesMax, "unit.movesMax"),
    p.promotions as never[],
    asNum(p.experience, "unit.experience"),
    asNum(p.fortifiedTurns, "unit.fortifiedTurns"),
    asBool(p.isEmbarked, "unit.isEmbarked"),
    (p.moveOrder as HexKey[] | undefined) ?? [],
  );
}

export function reviveCity(p: PlainEntity, registry: Registry): City {
  for (const buildingId of (p.buildings as DefId[] | undefined) ?? []) {
    assertKnownDefId(buildingId, registry.buildings, "city.buildings");
  }
  return new City(
    p.id as EntityId,
    asNum(p.createdTurn, "city.createdTurn"),
    p.ownerId as PlayerId,
    asNum(p.foundedTurn, "city.foundedTurn"),
    p.centerTile as HexKey,
    p.name as string,
    asNum(p.population, "city.population"),
    asNum(p.foodStock, "city.foodStock"),
    asNum(p.productionStock, "city.productionStock"),
    p.workedTiles as HexKey[],
    p.claimedTiles as HexKey[],
    p.buildings as never[],
    p.wonders as never[],
    asNum(p.health, "city.health"),
    asNum(p.defenseStrength, "city.defenseStrength"),
    asBool(p.isCapital, "city.isCapital"),
  );
}

export function revivePlayer(p: PlainEntity, registry: Registry): Player {
  assertKnownDefId(p.civDefId as DefId, registry.civs, "player.civDefId");
  for (const techId of (p.researchedTechs as DefId[] | undefined) ?? []) {
    assertKnownDefId(techId, registry.techs, "player.researchedTechs");
  }
  const player = new Player(
    p.id as EntityId,
    asNum(p.createdTurn, "player.createdTurn"),
    p.civDefId as never,
    asBool(p.isAI, "player.isAI"),
    asBool(p.isBarbarian, "player.isBarbarian"),
    asNum(p.gold, "player.gold"),
    asNum(p.goldPerTurn, "player.goldPerTurn"),
    p.researchedTechs as never[],
    p.adoptedPolicies as never[],
    asNum(p.culturePerTurn, "player.culturePerTurn"),
    asNum(p.cultureStock, "player.cultureStock"),
    p.capitalCityId as CityId | null,
    asBool(p.isAlive, "player.isAlive"),
    p.eliminatedTurn as number | null,
  );
  player.currentResearch = (p.currentResearch as Player["currentResearch"] | undefined) ?? null;
  player.needsNextTech = (p.needsNextTech as boolean | undefined) ?? false;
  return player;
}

export function reviveTile(p: PlainEntity, registry: Registry): Tile {
  assertKnownDefId(p.terrainDefId as DefId, registry.terrains, "tile.terrainDefId");
  return new Tile(
    p.id as EntityId,
    asNum(p.createdTurn, "tile.createdTurn"),
    p.hexKey as HexKey,
    p.terrainDefId as never,
    p.featureDefId as never,
    p.resourceDefId as never,
    p.improvementDefId as never,
    asBool(p.riverEdge0, "tile.riverEdge0"),
    asBool(p.riverEdge1, "tile.riverEdge1"),
    asBool(p.riverEdge2, "tile.riverEdge2"),
    p.ownerCity as CityId | null,
    p.ownerPlayer as PlayerId | null,
    p.workedByCity as CityId | null,
    p.occupantUnitIds as UnitId[],
  );
}
