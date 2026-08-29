import type { AssetRegistry, PrimitiveShape, PrimitiveSpec } from "@freevilisation/content";
import { playerColorAccent, resolvePlayerColor } from "../scene/playerColors";
import type { CityId } from "@freevilisation/engine";
import { useGameViewStore } from "../scene/gameViewStore";
import { scaleCitySpec } from "./cityGrowth";
import * as THREE from "three";

export interface T1CompositorProps {
  readonly registry: AssetRegistry;
  readonly defId: string;
  readonly cityId?: CityId;
  readonly population?: number;
  readonly ownerColor?: THREE.ColorRepresentation;
  readonly position?: [number, number, number];
  readonly scale?: number;
}

const FALLBACK_SPECS: Readonly<Record<string, PrimitiveSpec>> = {
  unit: {
    shapes: [
      { kind: "cylinder", scale: [0.72, 0.22, 0.72], position: [0, 0.11, 0] },
      { kind: "cone", scale: [0.48, 0.8, 0.48], position: [0, 0.62, 0] },
    ],
  },
  building: {
    shapes: [
      { kind: "box", scale: [0.9, 0.75, 0.9], position: [0, 0.375, 0] },
      { kind: "cone", scale: [0.72, 0.42, 0.72], position: [0, 0.96, 0] },
    ],
  },
  wonder: {
    shapes: [
      { kind: "cylinder", scale: [0.9, 0.22, 0.9], position: [0, 0.11, 0] },
      { kind: "cone", scale: [0.78, 1.35, 0.78], position: [0, 0.88, 0] },
    ],
  },
};

function categoryOf(defId: string): string {
  return defId.split(".")[0] ?? "";
}

/** Resolve manifest geometry, retaining a readable category fallback for sparse manifests. */
export function resolveT1Spec(registry: AssetRegistry, defId: string): PrimitiveSpec | undefined {
  return registry.resolve(defId)?.primitive ?? FALLBACK_SPECS[categoryOf(defId)];
}

/** Resolve the material color used by all primitives in a T1 composition. */
export function resolveT1Color(
  registry: AssetRegistry,
  defId: string,
  ownerColor?: THREE.ColorRepresentation,
): THREE.Color {
  const palette = registry.resolve(defId)?.palette?.[0];
  if (palette) return new THREE.Color(palette);
  if (ownerColor !== undefined) return new THREE.Color(ownerColor);
  return resolvePlayerColor(undefined);
}

function PrimitiveMesh({
  shape,
  color,
}: {
  readonly shape: PrimitiveShape;
  readonly color: THREE.Color;
}) {
  const scale = shape.scale ?? [1, 1, 1];
  const position = shape.position ?? [0, 0, 0];
  const rotation = shape.rotation ?? [0, 0, 0];
  const args =
    shape.kind === "box"
      ? [1, 1, 1]
      : shape.kind === "cylinder"
        ? [0.5, 0.5, 1, 12]
        : [0, 0.5, 1, 12];
  return (
    <mesh position={position} rotation={rotation} scale={scale}>
      {shape.kind === "box" && <boxGeometry args={args as [number, number, number]} />}
      {shape.kind === "cylinder" && (
        <cylinderGeometry args={args as [number, number, number, number]} />
      )}
      {shape.kind === "cone" && <coneGeometry args={args as [number, number, number, number]} />}
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

/** Renders a deterministic, manifest-driven placeholder composition for a definition. */
export function T1Compositor({
  registry,
  defId,
  cityId,
  population,
  ownerColor,
  position = [0, 0, 0],
  scale = 1,
}: T1CompositorProps) {
  const storePopulation = useGameViewStore((view) =>
    cityId ? view.gameState?.entities.cities[cityId]?.population : undefined,
  );
  const resolvedPopulation = population ?? storePopulation;
  const baseSpec = resolveT1Spec(registry, defId);
  const spec =
    baseSpec && resolvedPopulation !== undefined && categoryOf(defId) === "city"
      ? scaleCitySpec(baseSpec, resolvedPopulation)
      : baseSpec;
  const color = resolveT1Color(registry, defId, ownerColor);
  const accent = playerColorAccent({ colorHex: `#${color.getHexString()}` });
  if (!spec) return null;
  return (
    <group
      position={position}
      scale={scale}
      userData={{ defId, tier: "T1", population: resolvedPopulation }}
    >
      {spec.shapes.map((shape, index) => (
        <PrimitiveMesh key={`${shape.kind}-${index}`} shape={shape} color={accent} />
      ))}
    </group>
  );
}
