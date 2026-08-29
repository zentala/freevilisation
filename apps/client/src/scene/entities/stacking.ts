import type { EntityKind } from "./InstancedEntities";

export interface StackOffset {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const UNIT_OFFSETS: readonly StackOffset[] = [
  { x: 0, y: 0, z: 0 },
  { x: 0.28, y: 0, z: 0 },
  { x: -0.28, y: 0, z: 0 },
  { x: 0, y: 0, z: 0.28 },
  { x: 0, y: 0, z: -0.28 },
  { x: 0.2, y: 0, z: 0.2 },
];

/** Returns a stable local offset for entities sharing one map hex. */
export function stackOffset(kind: EntityKind, index: number): StackOffset {
  if (!Number.isInteger(index) || index < 0)
    throw new Error("Stack index must be a non-negative integer");
  if (kind === "city") return { x: 0, y: 0, z: 0 };
  return UNIT_OFFSETS[index % UNIT_OFFSETS.length]!;
}
