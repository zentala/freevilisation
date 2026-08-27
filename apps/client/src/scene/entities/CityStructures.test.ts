import { describe, expect, it } from "vitest";
import { City } from "@freevilisation/engine";
import type { BuildingDefId, EntityId, HexKey, WonderDefId } from "@freevilisation/engine";
import { cityStructureMarkers } from "./CityStructures";

function makeCity(): City {
  return new City(
    "city-1" as EntityId,
    0,
    "player-1" as never,
    0,
    "1,2" as HexKey,
    "Capital",
    3,
    0,
    0,
    [],
    [],
    ["building_granary" as BuildingDefId],
    ["wonder_pyramids" as WonderDefId],
    100,
    10,
    true,
  );
}

describe("cityStructureMarkers", () => {
  it("resolves buildings and wonders to asset categories with stable offsets", () => {
    const markers = cityStructureMarkers(makeCity());
    expect(markers.map(({ defId, kind }) => ({ defId, kind }))).toEqual([
      { defId: "building.granary", kind: "building" },
      { defId: "wonder.pyramids", kind: "wonder" },
    ]);
    expect(markers[0]?.position).not.toEqual(markers[1]?.position);
  });

  it("keeps marker positions deterministic for repeated calls", () => {
    const city = makeCity();
    expect(cityStructureMarkers(city)).toEqual(cityStructureMarkers(city));
  });
});
