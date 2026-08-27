import type { FeatureDefId, Prng, TerrainDefId } from "@freevilisation/engine";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { LandmassResult } from "./landmass.js";
import { TERRAIN, type ClimateResult } from "./climate.js";
import { MAP_TYPE_PRESETS, wrapContextFor } from "../config.js";
import { floodComponents, type FloodGrid } from "../flood.js";
import { drawSeed, fractalNoise2D } from "../noise.js";
import { equatorWeight } from "../latitude.js";

/** Fresh, non-sailable-by-ocean-ships water — distinct from the default ocean terrain. */
export const TERRAIN_LAKE = "terrain_lake" as TerrainDefId;

/**
 * Polar ice. Defined here rather than in `features.ts` because `water.ts`
 * decides where it goes on water tiles; `features.ts` imports this constant
 * back for the land case (snow-tile ice) so the two placements share one id
 * instead of two literals that could drift apart. See the "ice ownership"
 * comment on `generateFeatures` for the full split.
 */
export const FEATURE_ICE = "feature_ice" as FeatureDefId;

export interface WaterResult {
  /** `climate.terrainDefId` with enclosed small water components reclassified as `terrain_lake`. */
  readonly terrainDefId: TerrainDefId[];
  /**
   * `feature_ice` on ocean/coast tiles above the map type's latitude
   * threshold; `null` everywhere else, including lakes (see `placeIce`).
   * Index-aligned with `terrainDefId`, disjoint from `features.ts`'s land
   * placements — merged into the pipeline's final `featureDefId` by
   * `generateFeatures`.
   */
  readonly featureDefId: (FeatureDefId | null)[];
}

/** Frequency/octave shape for the ragged ice-boundary noise, same order of magnitude as `features.ts`'s density noise. */
const ICE_NOISE_FREQUENCY = 8;
const ICE_NOISE_OCTAVES = 3;
const ICE_NOISE_PERSISTENCE = 0.5;
const ICE_NOISE_LACUNARITY = 2;
/** How far the noise can perturb the latitude cutoff, in the same [0,1] "poleward" units as `equatorWeight`. */
const ICE_NOISE_AMPLITUDE = 0.12;

/**
 * Places `feature_ice` on ocean/coast tiles whose noise-perturbed poleward
 * latitude exceeds `latitudeThreshold`.
 *
 * Lakes do not freeze in v1 — a deliberate simplification, not an
 * oversight: fresh water bodies are small and scattered, and a per-lake
 * freeze rule belongs with whatever ruleset epic first cares about it, not
 * with the raw classification pass. Land ice (snow-tile ice) is placed
 * separately by `features.ts`; the two never touch the same tile because
 * `FEATURE_VALID_TERRAINS` in `features.ts` requires land terrain, and this
 * function requires ocean or coast.
 */
function placeIce(
  width: number,
  height: number,
  terrainDefId: readonly TerrainDefId[],
  latitudeThreshold: number,
  icePrng: Prng,
): (FeatureDefId | null)[] {
  const featureDefId = new Array<FeatureDefId | null>(width * height).fill(null);
  const seed = drawSeed(icePrng);

  for (let r = 0; r < height; r++) {
    const poleward = 1 - equatorWeight(r, height);
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      const terrain = terrainDefId[idx]!;
      if (terrain !== TERRAIN.ocean && terrain !== TERRAIN.coast) continue;

      const noise = fractalNoise2D(
        (q * ICE_NOISE_FREQUENCY) / width,
        (r * ICE_NOISE_FREQUENCY) / height,
        seed,
        ICE_NOISE_OCTAVES,
        ICE_NOISE_PERSISTENCE,
        ICE_NOISE_LACUNARITY,
      );
      const perturbed = poleward + (noise - 0.5) * 2 * ICE_NOISE_AMPLITUDE;
      if (perturbed >= latitudeThreshold) {
        featureDefId[idx] = FEATURE_ICE;
      }
    }
  }

  return featureDefId;
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

  const icePrng = ctx.prng.fork("ice");
  const latitudeThreshold = MAP_TYPE_PRESETS[params.mapType].iceLatitudeThreshold;
  const featureDefId = placeIce(width, height, terrainDefId, latitudeThreshold, icePrng);

  ctx.onProgress(100);
  return { terrainDefId, featureDefId };
}
