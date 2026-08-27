import type { TerrainDefId } from "@freevilisation/engine";
import { drawSeed, fractalNoise2D, percentileThreshold } from "../noise.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { equatorWeight } from "../latitude.js";

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

/** Moisture noise parameters — chosen in the same order of magnitude as config.ts presets. */
const MOISTURE_FREQUENCY = 10;
const MOISTURE_OCTAVES = 4;
const MOISTURE_PERSISTENCE = 0.5;
const MOISTURE_LACUNARITY = 2;

/**
 * Target band fractions, expressed as quantiles over the *observed*
 * land-tile temperature/moisture distribution rather than fixed values on
 * the raw latitude/noise domain (see `percentileThreshold` in noise.ts for
 * why: pole bias and continent shape already skew that domain per map
 * type and seed, so a fixed value does not hold a stable tile share).
 *
 * Temperature quantiles are cumulative bottom-up boundaries: coldest
 * `TEMP_SNOW_QUANTILE` fraction of land tiles → snow, next
 * `TEMP_COLD_QUANTILE` → cold band, next `TEMP_TEMPERATE_QUANTILE` →
 * temperate band, remainder → hot band. Moisture quantiles are the same
 * shape, computed separately within each temperature band's own tiles.
 */
const TEMP_SNOW_QUANTILE = 0.15;
const TEMP_COLD_QUANTILE = 0.35;
const TEMP_TEMPERATE_QUANTILE = 0.65;
const COLD_MOISTURE_QUANTILE = 0.45;
const TEMPERATE_DESERT_QUANTILE = 0.3;
const TEMPERATE_GRASSLAND_QUANTILE = 0.6;
const HOT_DESERT_QUANTILE = 0.25;
const HOT_GRASSLAND_QUANTILE = 0.55;

/**
 * Compute per-tile temperature from latitude.
 *
 * Row 0 = north pole (coldest, 0), row (h-1)/2 = equator (hottest, 1),
 * row h-1 = south pole (coldest, 0). Linear falloff from equator — shape
 * shared with landmass.ts's pole bias via `equatorWeight`.
 */
function temperatureFromLatitude(r: number, height: number): number {
  return equatorWeight(r, height);
}

/** Percentile cutoffs a map's land tiles are classified against — see the quantile constants above. */
interface ClimateCutoffs {
  readonly snowCutoff: number;
  readonly coldCutoff: number;
  readonly temperateCutoff: number;
  readonly coldMoistureCutoff: number;
  readonly temperateDesertCutoff: number;
  readonly temperateGrasslandCutoff: number;
  readonly hotDesertCutoff: number;
  readonly hotGrasslandCutoff: number;
}

/**
 * Derive `ClimateCutoffs` from a map's land-tile temperature and moisture
 * samples, so band boundaries track the observed distribution instead of
 * a fixed value on the raw domain.
 */
function climateCutoffsFor(landTemps: readonly number[], landMoistures: readonly number[]): ClimateCutoffs {
  const snowCutoff = percentileThreshold(landTemps, TEMP_SNOW_QUANTILE);
  const coldCutoff = percentileThreshold(landTemps, TEMP_COLD_QUANTILE);
  const temperateCutoff = percentileThreshold(landTemps, TEMP_TEMPERATE_QUANTILE);

  const coldMoistures: number[] = [];
  const temperateMoistures: number[] = [];
  const hotMoistures: number[] = [];
  for (let i = 0; i < landTemps.length; i++) {
    const t = landTemps[i]!;
    if (t <= snowCutoff) continue;
    if (t <= coldCutoff) coldMoistures.push(landMoistures[i]!);
    else if (t <= temperateCutoff) temperateMoistures.push(landMoistures[i]!);
    else hotMoistures.push(landMoistures[i]!);
  }

  return {
    snowCutoff,
    coldCutoff,
    temperateCutoff,
    coldMoistureCutoff: percentileThreshold(coldMoistures, COLD_MOISTURE_QUANTILE),
    temperateDesertCutoff: percentileThreshold(temperateMoistures, TEMPERATE_DESERT_QUANTILE),
    temperateGrasslandCutoff: percentileThreshold(temperateMoistures, TEMPERATE_GRASSLAND_QUANTILE),
    hotDesertCutoff: percentileThreshold(hotMoistures, HOT_DESERT_QUANTILE),
    hotGrasslandCutoff: percentileThreshold(hotMoistures, HOT_GRASSLAND_QUANTILE),
  };
}

/** Assign land terrain from temperature and moisture, against per-map percentile cutoffs. */
function landTerrain(temp: number, moisture: number, cutoffs: ClimateCutoffs): TerrainDefId {
  if (temp <= cutoffs.snowCutoff) return TERRAIN.snow;
  if (temp <= cutoffs.coldCutoff) {
    return moisture <= cutoffs.coldMoistureCutoff ? TERRAIN.tundra : TERRAIN.plains;
  }
  if (temp <= cutoffs.temperateCutoff) {
    if (moisture <= cutoffs.temperateDesertCutoff) return TERRAIN.desert;
    if (moisture <= cutoffs.temperateGrasslandCutoff) return TERRAIN.grassland;
    return TERRAIN.plains;
  }
  if (moisture <= cutoffs.hotDesertCutoff) return TERRAIN.desert;
  if (moisture <= cutoffs.hotGrasslandCutoff) return TERRAIN.grassland;
  return TERRAIN.plains;
}

/**
 * Generate terrain assignments from landmass data using latitude-based
 * temperature and a noise-driven moisture field.
 *
 * Every non-land tile gets `TERRAIN.ocean` here — a placeholder, not a
 * classification. `water.ts`'s `generateWater` is the sole source of truth
 * for coast vs. ocean vs. lake (E55-W1-T03): it recomputes the distinction
 * from a distance-to-land BFS and overwrites this placeholder. Earlier
 * versions of this stage classified coast tiles directly with a
 * land-adjacency check; that logic could not distinguish a lake shore from
 * an ocean shore and had no notion of shelf depth, so it moved to
 * `water.ts` instead of growing here.
 */
export function generateClimate(
  params: MapGenParams,
  landmass: LandmassResult,
  ctx: StageContext,
): ClimateResult {
  const { width, height, isLand } = landmass;
  const moistureSeed = drawSeed(ctx.prng.fork("moisture"));

  ctx.onProgress(0);

  const temp = new Array<number>(width * height);
  const moisture = new Array<number>(width * height);
  const landTemps: number[] = [];
  const landMoistures: number[] = [];

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      if (!isLand[idx]!) continue;

      const t = temperatureFromLatitude(r, height);
      const m = fractalNoise2D(
        (q * MOISTURE_FREQUENCY) / width,
        (r * MOISTURE_FREQUENCY) / width,
        moistureSeed,
        MOISTURE_OCTAVES,
        MOISTURE_PERSISTENCE,
        MOISTURE_LACUNARITY,
      );
      temp[idx] = t;
      moisture[idx] = m;
      landTemps.push(t);
      landMoistures.push(m);
    }
  }

  const cutoffs = climateCutoffsFor(landTemps, landMoistures);

  const terrainDefId = new Array<TerrainDefId>(width * height);
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      terrainDefId[idx] = isLand[idx]! ? landTerrain(temp[idx]!, moisture[idx]!, cutoffs) : TERRAIN.ocean;
    }
  }

  return { terrainDefId };
}
