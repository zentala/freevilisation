import { Canvas as R3FCanvas } from "@react-three/fiber";
import type { ReactNode } from "react";
import * as THREE from "three";
import { CameraRig } from "./CameraRig";

type SceneShellProps = {
  children?: ReactNode;
};

/** Empty scene slot for the chunk renderer added in a later renderer wave. */
export function TerrainChunks({ children }: SceneShellProps) {
  return <>{children}</>;
}

/** Empty scene slot for hover and selection visuals. */
export function SelectionOverlay({ children }: SceneShellProps) {
  return <>{children}</>;
}

/**
 * Root R3F scene with renderer settings shared by every scene composition.
 * The DPR range keeps high-density displays from exceeding the fill-rate budget.
 */
export default function SceneCanvas() {
  return (
    <R3FCanvas
      dpr={[1, 2]}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
      camera={{ far: 2_000, fov: 45, near: 0.1, position: [0, 10, 10] }}
    >
      <TerrainChunks>
        <CameraRig>
          <SelectionOverlay />
        </CameraRig>
      </TerrainChunks>
    </R3FCanvas>
  );
}
