import type { AssetRegistry } from "@freevilisation/content";
import type { HexKey } from "@freevilisation/engine";
import { useLayoutEffect, useMemo, useRef } from "react";
import { InstancedMesh, Object3D } from "three";
import { axialToWorld } from "../hexMath";
import { stackOffset } from "./stacking";

export type EntityKind = "unit" | "city";
export type VisibilityBucket = "visible" | "explored" | "unexplored";
export interface RenderEntity { readonly id: string; readonly defId: string; readonly hexKey: HexKey; readonly visibility: VisibilityBucket; }
export interface EntityBucket { readonly key: string; readonly entities: readonly RenderEntity[]; }

export function groupEntityBuckets(kind: EntityKind, entities: readonly RenderEntity[]): EntityBucket[] {
  const groups = new Map<string, RenderEntity[]>();
  for (const entity of entities) {
    const key = `${kind}:${entity.defId}:${entity.visibility}`;
    const group = groups.get(key) ?? [];
    group.push(entity);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, grouped]) => ({ key, entities: grouped }));
}

/** Smoke-testable instance counts for each renderer bucket. */
export function instanceCounts(kind: EntityKind, entities: readonly RenderEntity[]): Record<string, number> {
  return Object.fromEntries(groupEntityBuckets(kind, entities).map((bucket) => [bucket.key, bucket.entities.length]));
}

function EntityBatch({ bucket, registry }: { readonly bucket: EntityBucket; readonly registry: AssetRegistry }) {
  const mesh = useRef<InstancedMesh>(null);
  const marker = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    const target = mesh.current;
    if (!target) return;
    bucket.entities.forEach((entity, index) => {
      const [q = 0, r = 0] = entity.hexKey.split(",").map(Number);
      const offset = stackOffset(bucket.key.startsWith("city:") ? "city" : "unit", index);
      marker.position.copy(axialToWorld({ q, r }));
      marker.position.x += offset.x;
      marker.position.y += offset.y;
      marker.position.z += offset.z;
      target.setMatrixAt(index, marker.matrix);
    });
    target.instanceMatrix.needsUpdate = true;
  }, [bucket.entities, marker]);
  const asset = registry.resolve(bucket.entities[0]?.defId ?? "");
  return <instancedMesh ref={mesh} args={[asset ? undefined : undefined, undefined, bucket.entities.length]} userData={{ bucket: bucket.key }}><boxGeometry args={[0.7, 0.7, 0.7]} /><meshStandardMaterial color={bucket.entities[0]?.visibility === "explored" ? 0x64748b : 0x38bdf8} /></instancedMesh>;
}

export function InstancedEntities({ kind, entities, registry }: { readonly kind: EntityKind; readonly entities: readonly RenderEntity[]; readonly registry: AssetRegistry }) {
  return <group>{groupEntityBuckets(kind, entities).map((bucket) => <EntityBatch key={bucket.key} bucket={bucket} registry={registry} />)}</group>;
}
