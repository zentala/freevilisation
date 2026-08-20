import type { MapType, MapSize } from "./pipeline.js";

/** Map size presets — width and height in tiles. */
export const MAP_SIZES: Record<MapSize, { readonly width: number; readonly height: number }> = {
  tiny: { width: 56, height: 36 },
  small: { width: 66, height: 42 },
  standard: { width: 84, height: 54 },
  large: { width: 104, height: 64 },
  huge: { width: 128, height: 80 },
};

/** Parameters that control the landmass noise for each map type. */
export interface MapTypePreset {
  /** Frequency of the continent-scale noise layer. */
  readonly continentFrequency: number;
  /** Weight of the continent layer in the combined elevation. */
  readonly continentWeight: number;
  /** Frequency of the detail noise layer. */
  readonly detailFrequency: number;
  /** Weight of the detail layer in the combined elevation. */
  readonly detailWeight: number;
  /** Number of fractal octaves. */
  readonly octaves: number;
  /** Amplitude decay per octave. */
  readonly persistence: number;
  /** Frequency multiplier per octave. */
  readonly lacunarity: number;
  /** Elevation threshold above which a tile is land. */
  readonly landThreshold: number;
}

/** Per-map-type noise presets. */
export const MAP_TYPE_PRESETS: Record<MapType, MapTypePreset> = {
  continents: {
    continentFrequency: 3,
    continentWeight: 0.7,
    detailFrequency: 12,
    detailWeight: 0.3,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    landThreshold: 0.52,
  },
  pangaea: {
    continentFrequency: 1,
    continentWeight: 0.8,
    detailFrequency: 10,
    detailWeight: 0.2,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    landThreshold: 0.45,
  },
  archipelago: {
    continentFrequency: 8,
    continentWeight: 0.5,
    detailFrequency: 16,
    detailWeight: 0.5,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    landThreshold: 0.58,
  },
  islands: {
    continentFrequency: 16,
    continentWeight: 0.4,
    detailFrequency: 24,
    detailWeight: 0.6,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
    landThreshold: 0.64,
  },
};
