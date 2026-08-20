import type { ChunkKey } from "../ids.js";
import type { AxialCoord } from "./coords.js";

/**
 * Hexes per chunk edge. A chunk is a square block of CHUNK_SIZE² tiles
 * in axial space, used by the renderer for frustum culling.
 */
export const CHUNK_SIZE = 16;

/**
 * Converts an axial coordinate to the chunk key it belongs to.
 *
 * Chunk coordinates are derived by floor-dividing q and r by CHUNK_SIZE.
 * `Math.floor` is used, not truncation — negative coordinates map to
 * negative chunk indices (e.g. q = -1 belongs to chunk -1).
 */
export function toChunkKey(c: AxialCoord): ChunkKey {
  return `${Math.floor(c.q / CHUNK_SIZE)},${Math.floor(c.r / CHUNK_SIZE)}` as ChunkKey;
}

/**
 * Parses a `ChunkKey` back into chunk coordinates `{ cq, cr }`.
 *
 * Throws on any malformed key — not exactly two comma-separated integers.
 */
export function fromChunkKey(key: ChunkKey): { cq: number; cr: number } {
  const parts = (key as string).split(",");
  if (parts.length !== 2) {
    throw new Error(`Malformed ChunkKey: "${key}"`);
  }
  const cq = Number(parts[0]);
  const cr = Number(parts[1]);
  if (!Number.isFinite(cq) || !Number.isFinite(cr)) {
    throw new Error(`Malformed ChunkKey: "${key}"`);
  }
  if (!Number.isInteger(cq) || !Number.isInteger(cr)) {
    throw new Error(`Malformed ChunkKey: "${key}"`);
  }
  return { cq, cr };
}

/**
 * Returns all axial coordinates within the given chunk, in row-major order
 * (r ascending outer, q ascending inner). Exactly CHUNK_SIZE² = 256 coords.
 *
 * The iteration order is part of the contract — it decides mesh-build
 * order in E05, and build order is part of determinism.
 */
export function chunkTiles(key: ChunkKey): AxialCoord[] {
  const { cq, cr } = fromChunkKey(key);
  const tiles: AxialCoord[] = [];
  for (let r = 0; r < CHUNK_SIZE; r++) {
    for (let q = 0; q < CHUNK_SIZE; q++) {
      tiles.push({ q: cq * CHUNK_SIZE + q, r: cr * CHUNK_SIZE + r });
    }
  }
  return tiles;
}

/**
 * Returns chunk keys in a square block of `(2n+1)²` around the centre
 * chunk that contains `center`.
 *
 * `chunksInRadius(c, 0)` returns exactly `[toChunkKey(c)]`.
 * `chunkRadius < 0` throws.
 *
 * Order: cr ascending outer, cq ascending inner. No duplicates.
 */
export function chunksInRadius(center: AxialCoord, chunkRadius: number): ChunkKey[] {
  if (chunkRadius < 0) {
    throw new Error(`Chunk radius must be non-negative, got ${chunkRadius}`);
  }
  const { cq, cr } = fromChunkKey(toChunkKey(center));
  const keys: ChunkKey[] = [];
  for (let dr = -chunkRadius; dr <= chunkRadius; dr++) {
    for (let dq = -chunkRadius; dq <= chunkRadius; dq++) {
      keys.push(`${cq + dq},${cr + dr}` as ChunkKey);
    }
  }
  return keys;
}
