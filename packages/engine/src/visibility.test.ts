import { describe, expect, it } from "vitest";
import { buildGameMap } from "./hex/game-map.js";
import { Tile } from "./entities/Tile.js";
import type { EntityId, HexKey, PlayerId, ResourceDefId, TerrainDefId } from "./ids.js";
import {
  createVisibilityGrid,
  updateVisibility,
  updateVisibilityWithEvents,
  VisibilityState,
} from "./visibility.js";

function makeMap() {
  return buildGameMap(5, 5, false, (coord) => new Tile(
    `tile-${coord.q}-${coord.r}` as EntityId, 0, `${coord.q},${coord.r}` as HexKey,
    "terrain_grassland" as TerrainDefId, null, null, null, false, false, false,
    null, null, null, [],
  ));
}

describe("visibility grid", () => {
  it("reveals the sight radius while retaining explored fog", () => {
    const map = makeMap();
    const initial = createVisibilityGrid(map);
    const first = updateVisibility(map, initial, "1,1" as HexKey, 1);
    const second = updateVisibility(map, first, "3,3" as HexKey, 1);

    expect(first.cells[1 + 1 * map.width]).toBe(VisibilityState.Visible);
    expect(second.cells[1 + 1 * map.width]).toBe(VisibilityState.Explored);
    expect(second.cells[3 + 3 * map.width]).toBe(VisibilityState.Visible);
    expect(second.cells[0]).toBe(VisibilityState.Unexplored);
  });

  it("emits discovery notifications only when an unexplored tile is first revealed", () => {
    const map = makeMap();
    map.tiles["2,2" as HexKey]!.resourceDefId = "resource_wheat" as ResourceDefId;
    map.tiles["2,2" as HexKey]!.ownerPlayer = "p2" as PlayerId;
    const grid = createVisibilityGrid(map);

    const first = updateVisibilityWithEvents(map, grid, "2,2" as HexKey, 0, "p1" as PlayerId);
    const second = updateVisibilityWithEvents(map, first.grid, "2,2" as HexKey, 0, "p1" as PlayerId);

    expect(first.events).toEqual([
      { kind: "TileExplored", playerId: "p1", hexKey: "2,2" },
      { kind: "ResourceDiscovered", playerId: "p1", hexKey: "2,2", resourceDefId: "resource_wheat" },
      { kind: "CivilizationDiscovered", playerId: "p1", hexKey: "2,2", discoveredPlayerId: "p2" },
    ]);
    expect(second.events).toEqual([]);
  });
});
