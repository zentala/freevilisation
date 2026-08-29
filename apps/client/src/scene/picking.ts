import type { AxialCoord, Entity, EntityStore, HexKey } from "@freevilisation/engine";
import { toHexKey } from "@freevilisation/engine";
import { Plane, Ray, Vector3 } from "three";
import { worldToAxial } from "./hexMath";

/** The horizontal plane on which map tiles are laid out. */
export const GROUND_PLANE = new Plane(new Vector3(0, 1, 0), 0);

export type EntityLookup = Pick<EntityStore, "atHex">;

export interface PickResult {
  readonly coord: AxialCoord;
  readonly hexKey: HexKey;
  readonly entities: Entity[];
  readonly worldPoint: Vector3;
}

/**
 * Resolves a screen ray to the map hex below it.
 *
 * Picking intentionally uses one mathematical ground plane. It does not
 * raycast terrain meshes, so instancing and chunk visibility do not affect
 * interaction cost. A ray that misses the plane returns `null`.
 */
export function pickHex(
  ray: Ray,
  entityStore: EntityLookup,
  groundPlane: Plane = GROUND_PLANE,
): PickResult | null {
  const worldPoint = ray.intersectPlane(groundPlane, new Vector3());
  if (worldPoint == null) return null;

  const coord = worldToAxial(worldPoint);
  const hexKey = toHexKey(coord);
  return {
    coord,
    hexKey,
    entities: entityStore.atHex(hexKey),
    worldPoint: worldPoint.clone(),
  };
}
