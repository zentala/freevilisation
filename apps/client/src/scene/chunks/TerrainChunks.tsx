import type { AxialCoord } from "@freevilisation/engine";
import { useMemo } from "react";
import { ChunkRegistry } from "./ChunkRegistry";

export interface TerrainChunksProps {
  readonly coordinates?: readonly AxialCoord[];
}

/** Placeholder scene node; instanced terrain is implemented in E05-W3. */
export function TerrainChunks({ coordinates = [] }: TerrainChunksProps) {
  const registry = useMemo(() => {
    const value = new ChunkRegistry();
    coordinates.forEach((coord) => value.ensure(coord));
    return value;
  }, [coordinates]);

  void registry;
  return null;
}
