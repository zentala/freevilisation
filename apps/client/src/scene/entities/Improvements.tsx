import type { AssetRegistry } from "@freevilisation/content";
import type { HexKey } from "@freevilisation/engine";
import { axialToWorld } from "../hexMath";

export type ImprovementKind = "farm" | "mine" | "road";
export function improvementKind(defId: string | null): ImprovementKind | null {
  if (!defId) return null;
  const value = defId.toLowerCase();
  if (value.endsWith("farm")) return "farm";
  if (value.endsWith("mine")) return "mine";
  if (value.endsWith("road")) return "road";
  return null;
}

export function terrainOrientation(terrainDefId: string): number {
  return terrainDefId.toLowerCase().includes("hills") ||
    terrainDefId.toLowerCase().includes("mountain")
    ? Math.PI / 6
    : 0;
}

export function Improvement({
  registry,
  hexKey,
  terrainDefId,
  improvementDefId,
}: {
  readonly registry: AssetRegistry;
  readonly hexKey: HexKey;
  readonly terrainDefId: string;
  readonly improvementDefId: string | null;
}) {
  const kind = improvementKind(improvementDefId);
  if (!kind || !registry.resolve(improvementDefId ?? "")) return null;
  const [q = 0, r = 0] = hexKey.split(",").map(Number);
  const rotation = terrainOrientation(terrainDefId);
  return (
    <group
      position={axialToWorld({ q, r }).setY(0.18)}
      rotation={[0, rotation, 0]}
      userData={{ kind, improvementDefId }}
    >
      {kind === "farm" && (
        <mesh>
          <boxGeometry args={[0.65, 0.04, 0.65]} />
          <meshStandardMaterial color={0xd6a756} />
        </mesh>
      )}
      {kind === "mine" && (
        <mesh position={[0, 0.18, 0]}>
          <coneGeometry args={[0.28, 0.36, 6]} />
          <meshStandardMaterial color={0x64748b} />
        </mesh>
      )}
      {kind === "road" && (
        <mesh>
          <boxGeometry args={[0.9, 0.025, 0.18]} />
          <meshStandardMaterial color={0x78350f} />
        </mesh>
      )}
    </group>
  );
}
