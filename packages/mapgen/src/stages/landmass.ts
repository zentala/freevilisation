import type { Prng } from "@freevilisation/engine";
import { fractalNoise2D } from "../noise.js";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "../config.js";
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
 * Generate landmass elevation and land/water classification for a map.
 *
 * Uses two fractal noise layers (continent + detail) combined by weight.
 * Iteration order is row-major: `r` ascending outer, `q` ascending inner.
 */
export function generateLandmass(params: MapGenParams, ctx: StageContext): LandmassResult {
  const { width, height } = MAP_SIZES[params.mapSize]!;
  const preset = MAP_TYPE_PRESETS[params.mapType]!;

  const continentSeed = drawSeed(ctx.prng.fork("continent"));
  const detailSeed = drawSeed(ctx.prng.fork("detail"));

  const elevation = new Array<number>(width * height);
  const isLand = new Array<boolean>(width * height);

  for (let r = 0; r < height; r++) {
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
      const idx = r * width + q;
      elevation[idx] = combined;
      isLand[idx] = combined >= preset.landThreshold;
    }
  }

  return { width, height, elevation, isLand };
}
