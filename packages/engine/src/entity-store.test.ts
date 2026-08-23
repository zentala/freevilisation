import { describe, it, expect } from "vitest";
import { EntityStore } from "./entity-store.js";
import { Unit } from "./entities/Unit.js";
import { City } from "./entities/City.js";
import { Tile } from "./entities/Tile.js";
import { makeEntityId } from "./ids.js";
import type { HexKey, PlayerId, UnitDefId } from "./ids.js";

const P1 = "p1" as PlayerId;
const WARRIOR = "def_unit:warrior" as UnitDefId;

function makeUnit(id: number, coord: HexKey): Unit {
  return new Unit(makeEntityId(id), 0, WARRIOR, P1, coord, 10, 2, 2, [], 0, 0, false);
}

function makeCity(id: number, centerTile: HexKey): City {
  return new City(
    makeEntityId(id),
    0,
    P1,
    0,
    centerTile,
    "Rome",
    1,
    0,
    0,
    [],
    [],
    [],
    [],
    100,
    0,
    true,
  );
}

function makeTile(id: number, hexKey: HexKey): Tile {
  return new Tile(
    makeEntityId(id),
    0,
    hexKey,
    "def_terrain:grassland" as never,
    null,
    null,
    null,
    false,
    false,
    false,
    null,
    null,
    null,
    [],
  );
}

describe("EntityStore.atHex", () => {
  it("returns a unit standing on a tile", () => {
    const store = new EntityStore();
    const tile = makeTile(1, "0,0" as HexKey);
    const unit = makeUnit(2, "0,0" as HexKey);
    store.add(tile);
    store.add(unit);
    const found = store.atHex("0,0" as HexKey);
    expect(found).toContainEqual(unit);
    expect(found).toContainEqual(tile);
  });

  it("returns a city standing on its centre tile", () => {
    const store = new EntityStore();
    const city = makeCity(1, "1,1" as HexKey);
    store.add(city);
    expect(store.atHex("1,1" as HexKey)).toContainEqual(city);
  });

  it("returns nothing at a unit's old hex after it moves away", () => {
    const store = new EntityStore();
    const unit = makeUnit(1, "0,0" as HexKey);
    store.add(unit);

    store.remove(unit.id);
    unit.coord = "1,0" as HexKey;
    store.add(unit);

    expect(store.atHex("0,0" as HexKey)).toEqual([]);
    expect(store.atHex("1,0" as HexKey)).toContainEqual(unit);
  });

  it("returns nothing at a unit's hex after it is removed", () => {
    const store = new EntityStore();
    const unit = makeUnit(1, "0,0" as HexKey);
    store.add(unit);
    store.remove(unit.id);
    expect(store.atHex("0,0" as HexKey)).toEqual([]);
  });

  it("returns an empty array for an unindexed hex", () => {
    const store = new EntityStore();
    expect(store.atHex("9,9" as HexKey)).toEqual([]);
  });
});
