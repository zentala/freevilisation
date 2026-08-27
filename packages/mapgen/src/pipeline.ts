import {
  createPrng,
  type Prng,
  type TerrainDefId,
  type FeatureDefId,
  type ResourceDefId,
} from "@freevilisation/engine";
import { generateLandmass } from "./stages/landmass.js";
import { generateClimate } from "./stages/climate.js";
import { generateWater } from "./stages/water.js";
import { generateRivers } from "./stages/rivers.js";
import { generateFeatures } from "./stages/features.js";
import { generateResources } from "./stages/resources.js";
import { generateStartPositions } from "./stages/start-positions.js";
import type { StartPosition } from "./stages/start-positions.js";
import { generateWithValidation } from "./stages/validation.js";
import { MAP_SIZES, MAP_TYPE_PRESETS, wrapContextFor } from "./config.js";

/** The four supported map shapes. */
export type MapType = "continents" | "pangaea" | "archipelago" | "islands";

/** The five supported map sizes. */
export type MapSize = "tiny" | "small" | "standard" | "large" | "huge";

/** Top-level map generation parameters. */
export interface MapGenParams {
  /** Deterministic seed — same seed + same params always yields the same map. */
  readonly seed: number;
  /** Map shape / landmass distribution. */
  readonly mapType: MapType;
  /** Map size preset. */
  readonly mapSize: MapSize;
  /** Number of players to place start positions for. Defaults to 4. */
  readonly numPlayers?: number;
}

/** Context passed to every pipeline stage. */
export interface StageContext {
  /** Deterministic PRNG forked for this stage. */
  readonly prng: Prng;
  /** Progress callback, 0–100. */
  readonly onProgress: (pct: number) => void;
}

/** A single pipeline stage: transforms input to output with a context. */
export type Stage<In, Out> = (input: In, ctx: StageContext) => Out;

/** Complete map generation result. */
export interface MapGenResult {
  /** The seed used. */
  readonly seed: number;
  /** The map type. */
  readonly mapType: MapType;
  /** The map size. */
  readonly mapSize: MapSize;
  /** Map width in tiles. */
  readonly width: number;
  /** Map height in tiles. */
  readonly height: number;
  /**
   * Whether the map wraps east-west, joining the two vertical edges into a
   * cylinder. Decided by `mapType` (see `MAP_TYPE_PRESETS`) and honoured by
   * every stage that reads neighbours or measures distance.
   */
  readonly isWraparoundX: boolean;
  /** Elevation per tile, length = width * height, values in [0,1). */
  readonly elevation: number[];
  /** Land flag per tile, index-aligned with `elevation`. */
  readonly isLand: boolean[];
  /** Terrain definition id per tile, index-aligned with `elevation`. */
  readonly terrainDefId: TerrainDefId[];
  /**
   * Hex-step distance from each tile to its nearest land tile, `0` on land.
   * Computed once by `water.ts`'s coastal-shelf BFS and kept for reuse
   * rather than a second traversal (see `WaterResult.distanceToLand`).
   */
  readonly distanceToLand: number[];
  /**
   * River flags for the three edges each tile owns (directions 0, 1, 2 —
   * see ADR-026 and DATA-MODEL.md "River edges"), index-aligned with
   * `elevation`.
   */
  readonly riverEdgeDir0: boolean[];
  readonly riverEdgeDir1: boolean[];
  readonly riverEdgeDir2: boolean[];
  /** Feature definition id per tile, index-aligned with `elevation`; null = no feature. */
  readonly featureDefId: (FeatureDefId | null)[];
  /** Resource definition id per tile, index-aligned with `elevation`; null = no resource. */
  readonly resourceDefId: (ResourceDefId | null)[];
  /** Fair, spread-out starting tile per player. */
  readonly startPositions: StartPosition[];
}

/**
 * Generate a complete map from parameters.
 *
 * Synchronous — the Web Worker wrapping is the host's responsibility (E32).
 * Runs landmass, climate, water, rivers, features, resources and start positions,
 * then a validation pass (`generateWithValidation`) that repairs undersized
 * landmasses in place and bounded-rerolls with a forked seed for failures
 * it cannot repair locally (a stranded start, a shape mismatch).
 */
export function generateMap(
  params: MapGenParams,
  onProgress?: (pct: number) => void,
): MapGenResult {
  if (!Object.hasOwn(MAP_TYPE_PRESETS, params.mapType)) {
    throw new Error(`Unknown mapType: "${String(params.mapType)}"`);
  }
  if (!Object.hasOwn(MAP_SIZES, params.mapSize)) {
    throw new Error(`Unknown mapSize: "${String(params.mapSize)}"`);
  }

  return generateWithValidation(params, (attemptParams) => runStages(attemptParams, onProgress ?? (() => {})));
}

/** Runs the landmass -> climate -> water -> rivers -> features -> resources -> start-positions chain once. */
function runStages(params: MapGenParams, progress: (pct: number) => void): MapGenResult {
  const root = createPrng(params.seed);
  const landmassPrng = root.fork("landmass");

  // Seven stages share the 0-100 progress range in equal, monotonically
  // increasing slices.
  const SLICE_BOUNDARIES = [0, 14, 29, 43, 57, 71, 86, 100] as const;
  const sliceProgress =
    (stageIdx: number) =>
    (pct: number): void => {
      const start = SLICE_BOUNDARIES[stageIdx]!;
      const end = SLICE_BOUNDARIES[stageIdx + 1]!;
      progress(start + Math.round(((end - start) * pct) / 100));
    };

  progress(0);
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: sliceProgress(0),
  });
  progress(SLICE_BOUNDARIES[1]);

  const climatePrng = root.fork("climate");
  const climate = generateClimate(params, landmass, {
    prng: climatePrng,
    onProgress: sliceProgress(1),
  });
  progress(SLICE_BOUNDARIES[2]);

  const waterPrng = root.fork("water");
  const water = generateWater(params, landmass, climate, {
    prng: waterPrng,
    onProgress: sliceProgress(2),
  });
  progress(SLICE_BOUNDARIES[3]);

  const riversPrng = root.fork("rivers");
  const rivers = generateRivers(params, landmass, {
    prng: riversPrng,
    onProgress: sliceProgress(3),
  });
  progress(SLICE_BOUNDARIES[4]);

  const featuresPrng = root.fork("features");
  const features = generateFeatures(params, climate, water, {
    prng: featuresPrng,
    onProgress: sliceProgress(4),
  });
  progress(SLICE_BOUNDARIES[5]);

  const resourcesPrng = root.fork("resources");
  const resources = generateResources(params, climate, landmass, {
    prng: resourcesPrng,
    onProgress: sliceProgress(5),
  });
  progress(SLICE_BOUNDARIES[6]);

  const startPositionsPrng = root.fork("start-positions");
  const startPositions = generateStartPositions(params, landmass, climate, resources, {
    prng: startPositionsPrng,
    onProgress: sliceProgress(6),
  });
  progress(100);

  return {
    seed: params.seed,
    mapType: params.mapType,
    mapSize: params.mapSize,
    width: landmass.width,
    height: landmass.height,
    isWraparoundX: wrapContextFor(landmass.width).isWraparoundX,
    elevation: landmass.elevation,
    isLand: landmass.isLand,
    terrainDefId: water.terrainDefId,
    distanceToLand: water.distanceToLand,
    riverEdgeDir0: rivers.riverEdgeDir0,
    riverEdgeDir1: rivers.riverEdgeDir1,
    riverEdgeDir2: rivers.riverEdgeDir2,
    featureDefId: features.featureDefId,
    resourceDefId: resources.resourceDefId,
    startPositions: startPositions.startPositions,
  };
}
