import type { EntityId, AxialCoord } from "@freevilisation/engine";
import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { InstancedMesh, Object3D, Vector3 } from "three";
import { axialToWorld } from "../hexMath";
import type { AnimationSystem } from "../anim/AnimationSystem";

export interface SelectedEntity { readonly id: EntityId; readonly coord: AxialCoord; }

export function resolveSelectionRingTransforms(
  selected: readonly SelectedEntity[],
  animation?: Pick<AnimationSystem, "getCurrentTransform">,
): Vector3[] {
  return selected.map((entity) => animation?.getCurrentTransform(entity.id) ?? axialToWorld(entity.coord));
}

export function SelectionRings({ selected, animation }: { readonly selected: readonly SelectedEntity[]; readonly animation?: AnimationSystem }) {
  const mesh = useRef<InstancedMesh>(null);
  const marker = useMemo(() => new Object3D(), []);
  const update = () => {
    if (!mesh.current) return;
    resolveSelectionRingTransforms(selected, animation).forEach((position, index) => {
      marker.position.copy(position).setY(0.09);
      marker.scale.setScalar(0.88);
      marker.updateMatrix();
      mesh.current!.setMatrixAt(index, marker.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  };
  useLayoutEffect(update, [selected, animation]);
  useFrame(update);
  return <instancedMesh ref={mesh} args={[undefined, undefined, selected.length]}><torusGeometry args={[0.72, 0.045, 8, 24]} /><meshBasicMaterial color={0xfacc15} transparent opacity={0.8} /></instancedMesh>;
}
