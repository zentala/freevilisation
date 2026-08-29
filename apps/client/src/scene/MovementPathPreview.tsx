import { Line } from "@react-three/drei";
import type { HexKey } from "@freevilisation/engine";
import type { ReactElement } from "react";
import { Vector3 } from "three";
import { axialToWorld } from "./hexMath";

export interface MovementPathPreviewProps {
  readonly path: readonly HexKey[];
  readonly color?: string;
}

/** Converts a precomputed engine path into renderer world-space waypoints. */
export function buildPathPreviewPoints(path: readonly HexKey[]): Vector3[] {
  return path.map((key) => {
    const [q, r] = key.split(",").map(Number);
    return axialToWorld({ q: q ?? 0, r: r ?? 0 });
  });
}

/** Draws the currently previewed movement route above the terrain. */
export function MovementPathPreview({
  path,
  color = "#fbbf24",
}: MovementPathPreviewProps): ReactElement | null {
  if (path.length < 2) return null;
  return <Line points={buildPathPreviewPoints(path)} color={color} lineWidth={2} />;
}
