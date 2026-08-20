import { createPrng, type Prng, type TerrainDefId, type FeatureDefId } from "@freevilisation/engine";
import { generateLandmass } from "./stages/landmass.js";
import { generateClimate } from "./stages/climate.js";
import { generateRivers } from "./stages/rivers.js";
import { generateFeatures } from "./stages/features.js";
import { MAP_SIZES, MAP_TYPE_PRESETS } from "./config.js";

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
  /** Whether the map wraps east-west. */
  readonly isWraparoundX: true;
  /** Elevation per tile, length = width * height, values in [0,1). */
  readonly elevation: number[];
  /** Land flag per tile, index-aligned with `elevation`. */
  readonly isLand: boolean[];
  /** Terrain definition id per tile, index-aligned with `elevation`. */
  readonly terrainDefId: TerrainDefId[];
  /** River flag per tile, index-aligned with `elevation`. */
  readonly hasRiver: boolean[];
  /** Feature definition id per tile, index-aligned with `elevation`; null = no feature. */
  readonly featureDefId: (FeatureDefId | null)[];
}

/**
 * Generate a complete map from parameters.
 *
 * Synchronous — the Web Worker wrapping is the host's responsibility (E32).
 * Runs landmass, climate, rivers, then features; later stages will be
 * inserted here.
 */
export function generateMap(
  params: MapGenParams,
  onProgress?: (pct: number) => void,
): MapGenResult {
  const progress = onProgress ?? (() => {});

  if (!Object.hasOwn(MAP_TYPE_PRESETS, params.mapType)) {
    throw new Error(`Unknown mapType: "${String(params.mapType)}"`);
  }
  if (!Object.hasOwn(MAP_SIZES, params.mapSize)) {
    throw new Error(`Unknown mapSize: "${String(params.mapSize)}"`);
  }

  const root = createPrng(params.seed);
  const landmassPrng = root.fork("landmass");

  progress(0);
  const landmass = generateLandmass(params, {
    prng: landmassPrng,
    onProgress: (pct) => progress(Math.round(pct * 0.25)),
  });
  progress(25);

  const climatePrng = root.fork("climate");
  const climate = generateClimate(params, landmass, {
    prng: climatePrng,
    onProgress: (pct) => progress(25 + Math.round(pct * 0.25)),
  });
  progress(50);

  const riversPrng = root.fork("rivers");
  const rivers = generateRivers(params, landmass, {
    prng: riversPrng,
    onProgress: (pct) => progress(50 + Math.round(pct * 0.25)),
  });
  progress(75);

  const featuresPrng = root.fork("features");
  const features = generateFeatures(params, climate, {
    prng: featuresPrng,
    onProgress: (pct) => progress(75 + Math.round(pct * 0.25)),
  });
  progress(100);

  return {
    seed: params.seed,
    mapType: params.mapType,
    mapSize: params.mapSize,
    width: landmass.width,
    height: landmass.height,
    isWraparoundX: true,
    elevation: landmass.elevation,
    isLand: landmass.isLand,
    terrainDefId: climate.terrainDefId,
    hasRiver: rivers.hasRiver,
    featureDefId: features.featureDefId,
  };
}
