import type { AxialCoord, ChunkKey } from "@freevilisation/engine";
import { CHUNK_SIZE, chunkTiles, fromChunkKey, toChunkKey } from "@freevilisation/engine";

export interface ChunkBounds {
  readonly minQ: number;
  readonly maxQ: number;
  readonly minR: number;
  readonly maxR: number;
}

export interface ChunkState {
  readonly key: ChunkKey;
  readonly bounds: ChunkBounds;
  readonly tiles: readonly AxialCoord[];
  dirty: boolean;
}

export function boundsForChunk(key: ChunkKey): ChunkBounds {
  const { cq, cr } = fromChunkKey(key);
  const minQ = cq * CHUNK_SIZE;
  const minR = cr * CHUNK_SIZE;
  return {
    minQ,
    maxQ: minQ + CHUNK_SIZE - 1,
    minR,
    maxR: minR + CHUNK_SIZE - 1,
  };
}

export class ChunkRegistry {
  private readonly chunks = new Map<ChunkKey, ChunkState>();

  ensure(coord: AxialCoord): ChunkState {
    const key = toChunkKey(coord);
    const existing = this.chunks.get(key);
    if (existing) return existing;
    const state: ChunkState = {
      key,
      bounds: boundsForChunk(key),
      tiles: chunkTiles(key),
      dirty: true,
    };
    this.chunks.set(key, state);
    return state;
  }

  markDirty(coord: AxialCoord): void {
    this.ensure(coord).dirty = true;
  }

  markClean(key: ChunkKey): void {
    const chunk = this.chunks.get(key);
    if (chunk) chunk.dirty = false;
  }

  /** Returns chunks changed since the last render pass in stable insertion order. */
  dirtyChunks(): readonly ChunkState[] {
    return [...this.chunks.values()].filter((chunk) => chunk.dirty);
  }

  /** Marks all currently dirty chunks clean and returns the affected keys. */
  consumeDirty(): readonly ChunkKey[] {
    const dirty = this.dirtyChunks().map((chunk) => chunk.key);
    for (const key of dirty) this.markClean(key);
    return dirty;
  }

  get(key: ChunkKey): ChunkState | undefined {
    return this.chunks.get(key);
  }

  values(): IterableIterator<ChunkState> {
    return this.chunks.values();
  }

  get size(): number {
    return this.chunks.size;
  }
}
