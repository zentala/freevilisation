import { describe, expect, it } from "vitest";
import { buildGameMap } from "./hex/game-map.js";
import { Tile } from "./entities/Tile.js";
import type { EntityId, HexKey, TerrainDefId } from "./ids.js";
import {
  createVisibilityGrid,
  updateVisibility,
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
});
