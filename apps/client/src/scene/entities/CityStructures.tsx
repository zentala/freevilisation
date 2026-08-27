import type { AssetRegistry } from "@freevilisation/content";
import type { BuildingDefId, City, WonderDefId } from "@freevilisation/engine";
import type { ReactElement } from "react";
import { axialToWorld } from "../hexMath";
import { T1Compositor } from "../../assets/T1Compositor";

export interface StructureMarker {
  readonly defId: string;
  readonly position: [number, number, number];
  readonly kind: "building" | "wonder";
}

export interface CityStructuresProps {
  readonly city: City;
  readonly registry: AssetRegistry;
}

const OFFSETS: readonly [number, number][] = [
  [-0.34, -0.2],
  [0.34, -0.2],
  [-0.34, 0.2],
  [0.34, 0.2],
];

function assetId(defId: string, category: "building" | "wonder"): string {
  const suffix = defId.includes("_") ? defId.slice(defId.indexOf("_") + 1) : defId;
  return `${category}.${suffix}`;
}

/** Produces stable local offsets so structures on one city tile do not overlap. */
export function cityStructureMarkers(city: City): StructureMarker[] {
  const definitions = [
    ...city.buildings.map((defId: BuildingDefId) => ({ defId, kind: "building" as const })),
    ...city.wonders.map((defId: WonderDefId) => ({ defId, kind: "wonder" as const })),
  ];
  const centre = axialToWorld(parseCoord(city.centerTile));
  return definitions.map(({ defId, kind }, index) => {
    const [x, z] = OFFSETS[index % OFFSETS.length]!;
    return { defId: assetId(defId, kind), kind, position: [centre.x + x, 0, centre.z + z] };
  });
}

/** Renders all city buildings and wonders through the shared asset compositor. */
export function CityStructures({ city, registry }: CityStructuresProps): ReactElement {
  return (
    <group>
      {cityStructureMarkers(city).map((marker, index) => (
        <T1Compositor
          key={`${marker.kind}-${marker.defId}-${index}`}
          registry={registry}
          defId={marker.defId}
          position={marker.position}
          scale={0.42}
        />
      ))}
    </group>
  );
}

function parseCoord(key: string): { q: number; r: number } {
  const [q, r] = key.split(",").map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}
