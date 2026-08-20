import type { Prng, FeatureDefId, TerrainDefId } from "@freevilisation/engine";
import { fractalNoise2D } from "../noise.js";
import type { MapGenParams, StageContext } from "../pipeline.js";
import type { ClimateResult } from "./climate.js";
import { MAP_SIZES } from "../config.js";

export const FEATURE = {
  forest: "feature_forest" as FeatureDefId,
  jungle: "feature_jungle" as FeatureDefId,
  marsh: "feature_marsh" as FeatureDefId,
  ice: "feature_ice" as FeatureDefId,
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
  ["terrain_snow" as TerrainDefId], // ice — snow only; terrain_coast is always water
];

export function generateFeatures(
  params: MapGenParams,
  climate: ClimateResult,
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
