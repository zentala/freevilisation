export const MAPGEN_PACKAGE = "@freevilisation/mapgen" as const;

export { generateMap } from "./pipeline.js";
export type { MapGenParams, MapGenResult } from "./pipeline.js";
export type { MapType, MapSize } from "./pipeline.js";
export { MAP_SIZES, MAP_TYPE_PRESETS } from "./config.js";
