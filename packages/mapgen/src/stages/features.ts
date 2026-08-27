import type { Prng, FeatureDefId, TerrainDefId } from "@freevilisation/engine";
import { fractalNoise2D } from "../noise.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { ClimateResult } from "./climate.js";
import { FEATURE_ICE, type WaterResult } from "./water.js";
import { MAP_SIZES } from "../config.js";

export const FEATURE = {
  forest: "feature_forest" as FeatureDefId,
  jungle: "feature_jungle" as FeatureDefId,
  marsh: "feature_marsh" as FeatureDefId,
  ice: FEATURE_ICE,
} as const;

export interface FeaturesResult {
  readonly featureDefId: (FeatureDefId | null)[];
}

function drawSeed(prng: Prng): number {
  return Math.floor(prng.next() * 0x100000000) >>> 0;
}

const FEATURE_VALID_TERRAINS: readonly TerrainDefId[][] = [
  ["terrain_plains" as TerrainDefId, "terrain_tundra" as TerrainDefId], // forest
  ["terrain_grassland" as TerrainDefId], // jungle — grassland only
  ["terrain_grassland" as TerrainDefId, "terrain_plains" as TerrainDefId], // marsh
  ["terrain_snow" as TerrainDefId], // ice — land case only; the water case is placed by water.ts, see below
];

/**
 * Ice ownership split: `feature_ice` is placed by two stages on two
 * disjoint terrain domains, never the same tile twice.
 *
 * - `water.ts` (`placeIce`) places it on ocean/coast tiles above a
 *   latitude threshold, before this stage runs.
 * - This stage places it on land `terrain_snow` tiles via the same
 *   density noise as forest/jungle/marsh, below.
 *
 * `FEATURE_VALID_TERRAINS` above only ever matches land terrain, so the
 * loop below can never overwrite a water tile's ice; merging simply keeps
 * `water.featureDefId` wherever it is non-null and falls through to the
 * land computation otherwise.
 */
export function generateFeatures(
  params: MapGenParams,
  climate: ClimateResult,
  water: WaterResult,
  ctx: StageContext,
): FeaturesResult {
  const { width, height } = MAP_SIZES[params.mapSize];
  const { terrainDefId } = climate;
  const tileCount = width * height;
  const featureDefId = new Array<FeatureDefId | null>(tileCount);

  const featurePrng = ctx.prng.fork("feature-density");
  ctx.onProgress(0);

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const idx = r * width + q;
      const waterFeature = water.featureDefId[idx]!;
      if (waterFeature !== null) {
        featureDefId[idx] = waterFeature;
        continue;
      }
      const terrain = terrainDefId[idx]!;

      let featureIndex = -1;
      for (let i = 0; i < FEATURE_VALID_TERRAINS.length; i++) {
        if (FEATURE_VALID_TERRAINS[i]!.includes(terrain)) {
          featureIndex = i;
          break;
        }
      }

      if (featureIndex === -1) {
        featureDefId[idx] = null;
        continue;
      }

      const density = fractalNoise2D(
        (q * 10) / width,
        (r * 10) / height,
        drawSeed(featurePrng),
        4,
        0.5,
        2,
      );

      if (density >= 0.55) {
        featureDefId[idx] = FEATURE[Object.keys(FEATURE)[featureIndex]! as keyof typeof FEATURE];
      } else {
        featureDefId[idx] = null;
      }
    }
  }

  return { featureDefId };
}
