import type { Prng } from "@freevilisation/engine";
import { fractalNoise2D } from "../noise.js";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "../config.js";
import { equatorWeight } from "../latitude.js";
import type { MapGenParams, StageContext } from "../pipeline.js";

/** Result of the landmass/elevation stage. */
export interface LandmassResult {
  /** Map width in tiles. */
  readonly width: number;
  /** Map height in tiles. */
  readonly height: number;
  /** Elevation per tile, length = width * height, values in [0,1). */
  readonly elevation: number[];
  /** Land flag per tile, index-aligned with `elevation`. */
  readonly isLand: boolean[];
}

function drawSeed(prng: Prng): number {
  return Math.floor(prng.next() * 0x100000000) >>> 0;
}

/**
 * How strongly elevation is pulled toward water at the poles: 0 disables the
 * bias, 1 would flatten the poles to zero elevation. Mirrors Freeciv's
 * `normalize_hmap_poles()`.
 */
const POLE_BIAS_STRENGTH = 0.6;

/**
 * Find the elevation value at or above which exactly `targetLandFraction`
 * of tiles fall — a percentile cut over a sorted copy of the elevation
 * array, not a fixed threshold, so the resulting land share tracks the
 * target regardless of seed (Unciv/Freeciv approach).
 */
function landCutoff(elevation: readonly number[], targetLandFraction: number): number {
  const sorted = [...elevation].sort((a, b) => a - b);
  const cutIndex = Math.min(
    Math.max(Math.floor((1 - targetLandFraction) * sorted.length), 0),
    sorted.length - 1,
  );
  return sorted[cutIndex]!;
}

/**
 * Generate landmass elevation and land/water classification for a map.
 *
 * Uses two fractal noise layers (continent + detail) combined by weight,
 * then biased toward water near the poles so continents thin out toward
 * the map's vertical extremes instead of running to the edge arbitrarily.
 * Land is decided by a target fraction of tiles (`preset.targetLandFraction`),
 * not a fixed elevation threshold: the cut point is derived from the biased
 * elevation distribution itself. Iteration order is row-major: `r` ascending
 * outer, `q` ascending inner.
 */
export function generateLandmass(params: MapGenParams, ctx: StageContext): LandmassResult {
  const { width, height } = MAP_SIZES[params.mapSize]!;
  const preset = MAP_TYPE_PRESETS[params.mapType]!;

  const continentSeed = drawSeed(ctx.prng.fork("continent"));
  const detailSeed = drawSeed(ctx.prng.fork("detail"));

  const elevation = new Array<number>(width * height);
  const isLand = new Array<boolean>(width * height);

  for (let r = 0; r < height; r++) {
    const poleBias = 1 - POLE_BIAS_STRENGTH * (1 - equatorWeight(r, height));
    for (let q = 0; q < width; q++) {
      const continentValue = fractalNoise2D(
        (q * preset.continentFrequency) / width,
        (r * preset.continentFrequency) / width,
        continentSeed,
        preset.octaves,
        preset.persistence,
        preset.lacunarity,
      );
      const detailValue = fractalNoise2D(
        (q * preset.detailFrequency) / width,
        (r * preset.detailFrequency) / width,
        detailSeed,
        preset.octaves,
        preset.persistence,
        preset.lacunarity,
      );
      const combined = preset.continentWeight * continentValue + preset.detailWeight * detailValue;
      elevation[r * width + q] = combined * poleBias;
    }
  }

  const cutoff = landCutoff(elevation, preset.targetLandFraction);
  for (let i = 0; i < elevation.length; i++) {
    isLand[i] = elevation[i]! >= cutoff;
  }

  return { width, height, elevation, isLand };
}
