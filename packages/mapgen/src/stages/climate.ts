import { neighbors, type Prng, type TerrainDefId, type WrapContext } from "@freevilisation/engine";
import { fractalNoise2D } from "../noise.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { wrapContextFor } from "../config.js";

export const TERRAIN = {
  ocean: "terrain_ocean" as TerrainDefId,
  coast: "terrain_coast" as TerrainDefId,
  grassland: "terrain_grassland" as TerrainDefId,
  plains: "terrain_plains" as TerrainDefId,
  desert: "terrain_desert" as TerrainDefId,
  tundra: "terrain_tundra" as TerrainDefId,
  snow: "terrain_snow" as TerrainDefId,
} as const;

export interface ClimateResult {
  readonly terrainDefId: TerrainDefId[];
}

function drawSeed(prng: Prng): number {
  return Math.floor(prng.next() * 0x100000000) >>> 0;
}

/** Moisture noise parameters — chosen in the same order of magnitude as config.ts presets. */
const MOISTURE_FREQUENCY = 10;
const MOISTURE_OCTAVES = 4;
const MOISTURE_PERSISTENCE = 0.5;
const MOISTURE_LACUNARITY = 2;

/**
 * Compute per-tile temperature from latitude.
 *
 * Row 0 = north pole (coldest, 0), row (h-1)/2 = equator (hottest, 1),
 * row h-1 = south pole (coldest, 0). Linear falloff from equator.
 */
function temperatureFromLatitude(r: number, height: number): number {
  const equator = (height - 1) / 2;
  const halfHeight = height / 2;
  return 1 - Math.abs(r - equator) / halfHeight;
}

/**
 * Assign land terrain from temperature and moisture.
 *
 * Thresholds:
 *   temperature < 0.15 → snow (regardless of moisture)
 *   temperature < 0.35 → tundra if moisture < 0.45, plains otherwise
 *   temperature < 0.65 → desert if moisture < 0.3, grassland if < 0.6, plains otherwise
 *   temperature >= 0.65 → desert if moisture < 0.25, grassland if < 0.55, plains otherwise
 */
function landTerrain(temp: number, moisture: number): TerrainDefId {
  if (temp < 0.15) return TERRAIN.snow;
  if (temp < 0.35) return moisture < 0.45 ? TERRAIN.tundra : TERRAIN.plains;
  if (temp < 0.65) {
    if (moisture < 0.3) return TERRAIN.desert;
    if (moisture < 0.6) return TERRAIN.grassland;
    return TERRAIN.plains;
  }
  if (moisture < 0.25) return TERRAIN.desert;
  if (moisture < 0.55) return TERRAIN.grassland;
  return TERRAIN.plains;
}

function isCoast(
  q: number,
  r: number,
  width: number,
  height: number,
  isLand: boolean[],
  wrap: WrapContext,
): boolean {
  for (const { q: nq, r: nr } of neighbors({ q, r }, wrap)) {
    if (nr < 0 || nr >= height) continue;
    if (!wrap.isWraparoundX && (nq < 0 || nq >= width)) continue;
    if (isLand[nr * width + nq]!) return true;
  }
  return false;
}

/**
 * Generate terrain assignments from landmass data using latitude-based
 * temperature and a noise-driven moisture field.
 */
export function generateClimate(
  params: MapGenParams,
  landmass: LandmassResult,
  ctx: StageContext,
): ClimateResult {
  const { width, height, isLand } = landmass;
  const wrap = wrapContextFor(width);
  const moistureSeed = drawSeed(ctx.prng.fork("moisture"));

  ctx.onProgress(0);

  const terrainDefId = new Array<TerrainDefId>(width * height);

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;

      if (!isLand[idx]!) {
        terrainDefId[idx] = isCoast(q, r, width, height, isLand, wrap)
          ? TERRAIN.coast
          : TERRAIN.ocean;
        continue;
      }

      const temp = temperatureFromLatitude(r, height);
      const moisture = fractalNoise2D(
        (q * MOISTURE_FREQUENCY) / width,
        (r * MOISTURE_FREQUENCY) / width,
        moistureSeed,
        MOISTURE_OCTAVES,
        MOISTURE_PERSISTENCE,
        MOISTURE_LACUNARITY,
      );

      terrainDefId[idx] = landTerrain(temp, moisture);
    }
  }

  return { terrainDefId };
}
