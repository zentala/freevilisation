import { MapControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { ElementRef, ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { getEdgePan, getKeyboardPan, type PanVector } from "./cameraInput";

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
const CAMERA_PAN_SPEED = 24;
const EDGE_SCROLL_THRESHOLD = 32;

/** Clamps an orbit target and returns the correction applied to the target. */
export function clampTarget(target: THREE.Vector3, bounds: CameraBounds): THREE.Vector3 {
  const previousX = target.x;
  const previousZ = target.z;
  target.x = THREE.MathUtils.clamp(target.x, bounds.minX, bounds.maxX);
  target.z = THREE.MathUtils.clamp(target.z, bounds.minZ, bounds.maxZ);
  return new THREE.Vector3(target.x - previousX, 0, target.z - previousZ);
}

/**
 * RTS orbit camera with bounded map panning, distance, pitch, and keyboard input.
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
  const pressedKeys = useRef(new Set<string>());
  const edgePan = useRef<PanVector>({ x: 0, z: 0 });

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

  useEffect(() => {
    const currentControls = controls.current;
    const element = currentControls?.domElement;
    if (!element) return;

    const panCamera = (pan: PanVector) => {
      if (pan.x === 0 && pan.z === 0) return;
      const delta = new THREE.Vector3(pan.x, 0, pan.z);
      currentControls.target.add(delta);
      camera.position.add(delta);
      currentControls.update();
    };

    const isGameKey = (key: string) =>
      ["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(
        key,
      );
    const isTextInput = (target: EventTarget | null) =>
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isGameKey(event.key) && !isTextInput(event.target)) {
        pressedKeys.current.add(event.key);
        event.preventDefault();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key);
    };
    const handlePointerMove = (event: PointerEvent) => {
      edgePan.current = getEdgePan(
        event.clientX,
        event.clientY,
        element.getBoundingClientRect(),
        EDGE_SCROLL_THRESHOLD,
      );
    };
    const clearEdgePan = () => {
      edgePan.current = { x: 0, z: 0 };
    };

    let previousTime = performance.now();
    let frame = 0;
    const tick = (time: number) => {
      const deltaSeconds = Math.min((time - previousTime) / 1_000, 0.1);
      previousTime = time;
      const keyboardPan = getKeyboardPan(pressedKeys.current);
      frame = requestAnimationFrame(tick);
      if (deltaSeconds > 0) {
        const movement = CAMERA_PAN_SPEED * deltaSeconds;
        panCamera({
          x: (keyboardPan.x + edgePan.current.x) * movement,
          z: (keyboardPan.z + edgePan.current.z) * movement,
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    element.addEventListener("pointermove", handlePointerMove);
    element.addEventListener("pointerleave", clearEdgePan);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      element.removeEventListener("pointermove", handlePointerMove);
      element.removeEventListener("pointerleave", clearEdgePan);
    };
  }, [camera]);

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
