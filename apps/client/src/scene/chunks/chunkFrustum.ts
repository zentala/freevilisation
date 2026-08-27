import type { Camera } from "three";
import * as THREE from "three";
import { axialToWorld, HEX_SIZE } from "../hexMath";
import type { ChunkBounds } from "./ChunkRegistry";

const TERRAIN_HEIGHT = 0.2;

/** Returns a conservative world-space box for an entire chunk footprint. */
export function chunkBoundsBox(bounds: ChunkBounds): THREE.Box3 {
  const box = new THREE.Box3();
  for (const q of [bounds.minQ, bounds.maxQ]) {
    for (const r of [bounds.minR, bounds.maxR]) box.expandByPoint(axialToWorld({ q, r }));
  }
  box.min.x -= Math.sqrt(3) * HEX_SIZE;
  box.max.x += Math.sqrt(3) * HEX_SIZE;
  box.min.z -= HEX_SIZE;
  box.max.z += HEX_SIZE;
  box.min.y = -TERRAIN_HEIGHT / 2;
  box.max.y = TERRAIN_HEIGHT / 2;
  return box;
}

/** Tests a chunk against the camera's current world-space view frustum. */
export function isChunkVisible(bounds: ChunkBounds, camera: Camera): boolean {
  camera.updateMatrixWorld();
  const projection = new THREE.Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  return new THREE.Frustum()
    .setFromProjectionMatrix(projection)
    .intersectsBox(chunkBoundsBox(bounds));
}
