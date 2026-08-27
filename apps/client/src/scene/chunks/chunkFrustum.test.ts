import { describe, expect, it } from "vitest";
import * as THREE from "three";
import { boundsForChunk } from "./ChunkRegistry";
import { toChunkKey } from "@freevilisation/engine";
import { chunkBoundsBox, isChunkVisible } from "./chunkFrustum";

function cameraAt(x: number, z: number): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(x, 10, z);
  camera.lookAt(x, 0, z);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return camera;
}

describe("chunk frustum culling", () => {
  it("encloses a complete chunk footprint", () => {
    const box = chunkBoundsBox(boundsForChunk(toChunkKey({ q: 0, r: 0 })));
    expect(box.min.x).toBeLessThan(0);
    expect(box.max.x).toBeGreaterThan(15 * Math.sqrt(3));
    expect(box.min.z).toBeLessThan(0);
    expect(box.max.z).toBeGreaterThan(15 * 1.5);
  });

  it("keeps the camera's chunk visible", () => {
    expect(isChunkVisible(boundsForChunk(toChunkKey({ q: 0, r: 0 })), cameraAt(0, 10))).toBe(true);
  });

  it("rejects a distant chunk", () => {
    expect(isChunkVisible(boundsForChunk(toChunkKey({ q: 320, r: 320 })), cameraAt(0, 10))).toBe(false);
  });
});
