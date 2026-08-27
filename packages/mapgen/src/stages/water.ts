import type { TerrainDefId } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import type { ClimateResult } from "./climate.js";
import { MAP_TYPE_PRESETS, wrapContextFor } from "../config.js";
import { floodComponents, type FloodGrid } from "../flood.js";

/** Fresh, non-sailable-by-ocean-ships water — distinct from the default ocean terrain. */
export const TERRAIN_LAKE = "terrain_lake" as TerrainDefId;

export interface WaterResult {
  /** `climate.terrainDefId` with enclosed small water components reclassified as `terrain_lake`. */
  readonly terrainDefId: TerrainDefId[];
}

/** A component touches a map edge when one of its tiles sits in row 0 or the last row (north/south are hard edges, never wrapped). */
function touchesEdge(tiles: readonly number[], width: number, height: number): boolean {
  return tiles.some((idx) => {
    const r = Math.floor(idx / width);
    return r === 0 || r === height - 1;
  });
}

/**
 * Classifies water tiles into lake vs ocean.
 *
 * Flood-fills every non-land tile into connected components on the
 * wraparound-aware hex grid (`flood.ts`). A component that touches no map
 * edge and is smaller than the map type's `maxLakeSize` becomes
 * `terrain_lake`; everything else keeps whatever `climate.ts` already
 * assigned it (`terrain_ocean` or `terrain_coast`). On a cylinder there is
 * no east/west edge, so "touches the edge" means the north or south row —
 * a component that wraps around the world and meets itself is still one
 * component with no edge tile at all, and is excluded from becoming a lake
 * only by size, which is why `maxLakeSize` must stay well below a map's
 * total water tile count.
 *
 * Pure function of its inputs: no random draws, so the same tile arrays
 * always produce the same classification.
 */
export function generateWater(
  params: MapGenParams,
  landmass: LandmassResult,
  climate: ClimateResult,
  ctx: StageContext,
): WaterResult {
  const { width, height, isLand } = landmass;
  const grid: FloodGrid = { width, height, wrap: wrapContextFor(width) };
  const maxLakeSize = MAP_TYPE_PRESETS[params.mapType].maxLakeSize;

  ctx.onProgress(0);

  const terrainDefId = climate.terrainDefId.slice();
  const { componentTiles } = floodComponents(grid, (idx) => !isLand[idx]!);

  // componentTiles is already in row-major scan order, i.e. sorted by the
  // (r, q) of each component's seed tile — no extra sort needed.
  for (const tiles of componentTiles) {
    if (tiles.length >= maxLakeSize) continue;
    if (touchesEdge(tiles, width, height)) continue;
    for (const idx of tiles) {
      terrainDefId[idx] = TERRAIN_LAKE;
    }
  }

  ctx.onProgress(100);
  return { terrainDefId };
}
