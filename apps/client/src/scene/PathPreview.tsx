import type { GameState, HexKey } from "@freevilisation/engine";
import { useMemo } from "react";
import { axialToWorld } from "./hexMath";
import { previewPath } from "./pathPreview";

export interface PathPreviewProps {
  readonly state: GameState | null;
  readonly from: HexKey | null;
  readonly hovered: HexKey | null;
}

/** Renders the engine-computed route as translucent highlighted hexes. */
export function PathPreview({ state, from, hovered }: PathPreviewProps) {
  const path = useMemo(() => previewPath(state, from, hovered), [state, from, hovered]);
  return (
    <group>
      {path.map((hexKey) => (
        <mesh key={hexKey} position={axialToWorld({ q: Number(hexKey.split(",")[0]), r: Number(hexKey.split(",")[1]) }).setY(0.12)} rotation={[0, Math.PI / 6, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.025, 6]} />
          <meshBasicMaterial color={0x38bdf8} transparent opacity={0.62} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}
