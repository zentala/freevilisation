import type { WrapContext } from "@freevilisation/engine";
import { floodComponents, type FloodGrid } from "../flood.js";
import type { LandmassResult } from "./landmass.js";

/** Connected-component tile count below which a landmass is deleted. */
export const MIN_ISLAND_SIZE = 3;

/**
 * Removes undersized land components before any stage classifies terrain.
 * This keeps water, climate, resources and starts aligned with final land.
 */
export function removeTinyIslands(landmass: LandmassResult, wrap: WrapContext): LandmassResult {
  const grid: FloodGrid = { width: landmass.width, height: landmass.height, wrap };
  const flood = floodComponents(grid, (idx) => landmass.isLand[idx]!);
  const isLand = landmass.isLand.slice();
  let repaired = false;

  for (let idx = 0; idx < isLand.length; idx++) {
    const componentId = flood.componentId[idx]!;
    if (componentId === -1 || flood.componentSize[componentId]! >= MIN_ISLAND_SIZE) continue;
    isLand[idx] = false;
    repaired = true;
  }

  return repaired ? { ...landmass, isLand } : landmass;
}
