import type { AxialCoord, Entity } from "@freevilisation/engine";
import { useState, type ReactNode } from "react";
import { type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { axialToWorld } from "./hexMath";
import { pickHex, type EntityLookup, type PickResult } from "./picking";
import { playerColorNumber } from "./playerColors";

const HIGHLIGHT_RADIUS = 0.94;
const HIGHLIGHT_HEIGHT = 0.035;
const INPUT_PLANE_SIZE = 1_000;

export type SelectionOverlayProps = {
  readonly children?: ReactNode;
  readonly entityStore?: EntityLookup;
  readonly hovered?: PickResult | null;
  readonly selected?: PickResult | null;
  /** Civilization color for the selected owner's highlight ring. */
  readonly selectedPlayerColor?: string;
  readonly onHover?: (result: PickResult | null) => void;
  readonly onSelect?: (result: PickResult | null) => void;
};

const EMPTY_STORE: EntityLookup = {
  atHex: () => [] as Entity[],
};

/** Returns the world position used by a hex highlight. */
export function highlightPosition(coord: AxialCoord, height: number): THREE.Vector3 {
  return axialToWorld(coord).setY(height);
}

function resultFromEvent(event: { readonly ray: THREE.Ray }, store: EntityLookup): PickResult | null {
  return pickHex(event.ray, store);
}

function Highlight({
  result,
  color,
  height,
}: {
  readonly result: PickResult;
  readonly color: number;
  readonly height: number;
}) {
  return (
    <mesh position={highlightPosition(result.coord, height)} rotation={[0, Math.PI / 6, 0]}>
      <cylinderGeometry args={[HIGHLIGHT_RADIUS, HIGHLIGHT_RADIUS, HIGHLIGHT_HEIGHT, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.42} depthWrite={false} />
    </mesh>
  );
}

/** Renders hover and selection feedback from the logical picker result. */
export function SelectionOverlay({
  children,
  entityStore = EMPTY_STORE,
  hovered: controlledHovered,
  selected: controlledSelected,
  selectedPlayerColor,
  onHover,
  onSelect,
}: SelectionOverlayProps) {
  const [hovered, setHovered] = useState<PickResult | null>(null);
  const [selected, setSelected] = useState<PickResult | null>(null);
  const currentHovered = controlledHovered === undefined ? hovered : controlledHovered;
  const currentSelected = controlledSelected === undefined ? selected : controlledSelected;
  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    const result = resultFromEvent(event, entityStore);
    if (controlledHovered === undefined) setHovered(result);
    onHover?.(result);
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    const result = resultFromEvent(event, entityStore);
    if (controlledSelected === undefined) setSelected(result);
    onSelect?.(result);
  };
  const clearHover = () => {
    if (controlledHovered === undefined) setHovered(null);
    onHover?.(null);
  };

  return (
    <group>
      {children}
      <mesh
        onClick={handleClick}
        onPointerMove={handleMove}
        onPointerLeave={clearHover}
        position={[0, -0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[INPUT_PLANE_SIZE, INPUT_PLANE_SIZE]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {currentSelected && (
        <Highlight
          result={currentSelected}
          color={playerColorNumber(selectedPlayerColor ? { colorHex: selectedPlayerColor } : undefined)}
          height={0.08}
        />
      )}
      {currentHovered && <Highlight result={currentHovered} color={0xfacc15} height={0.13} />}
    </group>
  );
}
