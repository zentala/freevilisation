import type { WrapContext } from "@freevilisation/engine";
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
  /**
   * Target fraction of tiles that should be land, in (0,1). The landmass
   * stage derives its elevation cut point from this at generation time (the
   * value at the `1 - targetLandFraction` percentile of the elevation
   * distribution), rather than using a fixed threshold — so the actual land
   * share tracks the target regardless of seed.
   */
  readonly targetLandFraction: number;
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
    targetLandFraction: 0.42,
  },
  pangaea: {
    continentFrequency: 1,
    continentWeight: 0.8,
    detailFrequency: 10,
    detailWeight: 0.2,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    targetLandFraction: 0.55,
  },
  archipelago: {
    continentFrequency: 8,
    continentWeight: 0.5,
    detailFrequency: 16,
    detailWeight: 0.5,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    targetLandFraction: 0.3,
  },
  islands: {
    continentFrequency: 16,
    continentWeight: 0.4,
    detailFrequency: 24,
    detailWeight: 0.6,
    octaves: 3,
    persistence: 0.5,
    lacunarity: 2,
    targetLandFraction: 0.18,
  },
};

/**
 * The shape of the world, which is not the same question as where its land
 * lies. `continents` and `archipelago` describe how the landmass generator
 * distributes ground; the topology below describes the planet those shapes
 * sit on. Keeping the two apart is why this is not a field on
 * `MapTypePreset`: coupling them once already let a map type quietly decide
 * a world property, and the flat branch that nothing exercised is where the
 * square-grid bug hid (ADR-017, ADR-021).
 */
export type WorldTopology = "cylinder" | "flat";

/**
 * Every world is a cylinder in v1 — sailing west always brings you back from
 * the east. A flat world stays expressible so adding the option later is a
 * value passed in, not a change to the geometry code.
 */
export const DEFAULT_WORLD_TOPOLOGY: WorldTopology = "cylinder";

/** Builds the `WrapContext` every stage should use for a given map width. */
export function wrapContextFor(width: number, topology: WorldTopology = DEFAULT_WORLD_TOPOLOGY): WrapContext {
  return { isWraparoundX: topology === "cylinder", width };
}
