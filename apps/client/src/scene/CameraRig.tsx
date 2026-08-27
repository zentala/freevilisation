import { MapControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { ElementRef, ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";

export type CameraBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

export type CameraRigProps = {
  children?: ReactNode;
  bounds?: CameraBounds;
  minDistance?: number;
  maxDistance?: number;
  minPolarAngle?: number;
  maxPolarAngle?: number;
};

export const DEFAULT_CAMERA_BOUNDS: CameraBounds = {
  minX: -100,
  maxX: 100,
  minZ: -100,
  maxZ: 100,
};

const DEFAULT_MIN_DISTANCE = 4;
const DEFAULT_MAX_DISTANCE = 80;
const DEFAULT_MIN_POLAR_ANGLE = Math.PI / 8;
const DEFAULT_MAX_POLAR_ANGLE = Math.PI / 2.35;

/** Clamps an orbit target and returns the correction applied to the target. */
export function clampTarget(target: THREE.Vector3, bounds: CameraBounds): THREE.Vector3 {
  const previousX = target.x;
  const previousZ = target.z;
  target.x = THREE.MathUtils.clamp(target.x, bounds.minX, bounds.maxX);
  target.z = THREE.MathUtils.clamp(target.z, bounds.minZ, bounds.maxZ);
  return new THREE.Vector3(target.x - previousX, 0, target.z - previousZ);
}

/**
 * RTS orbit camera with bounded map panning, distance, and pitch.
 * MapControls owns input handling; this component only constrains its transform.
 */
export function CameraRig({
  children,
  bounds = DEFAULT_CAMERA_BOUNDS,
  minDistance = DEFAULT_MIN_DISTANCE,
  maxDistance = DEFAULT_MAX_DISTANCE,
  minPolarAngle = DEFAULT_MIN_POLAR_ANGLE,
  maxPolarAngle = DEFAULT_MAX_POLAR_ANGLE,
}: CameraRigProps) {
  const controls = useRef<ElementRef<typeof MapControls>>(null);
  const { camera } = useThree();

  const clampControls = useCallback(() => {
    const currentControls = controls.current;
    if (!currentControls) return;

    const correction = clampTarget(currentControls.target, bounds);
    camera.position.add(correction);
    camera.updateMatrixWorld();
  }, [bounds, camera]);

  useEffect(() => {
    clampControls();
  }, [clampControls]);

  return (
    <>
      <MapControls
        ref={controls}
        enableDamping
        dampingFactor={0.12}
        minDistance={minDistance}
        maxDistance={maxDistance}
        minPolarAngle={minPolarAngle}
        maxPolarAngle={maxPolarAngle}
        target={[0, 0, 0]}
        onChange={clampControls}
      />
      {children}
    </>
  );
}
