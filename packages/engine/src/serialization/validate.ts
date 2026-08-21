import type { DefId } from "../ids.js";

/** Plain JSON shape of a revived entity, before it is passed to `revive*`. */
export interface PlainEntity {
  id: string;
  type: string;
  ownerId: string | null;
  createdTurn: number;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Any = any;

/** Thrown when a save's JSON does not match the shape `deserialize` expects. */
export class SerializationError extends Error {}

export function asNum(v: unknown, field: string): number {
  if (typeof v !== "number") {
    throw new SerializationError(`Expected number for field "${field}", got ${typeof v}`);
  }
  return v;
}

export function asBool(v: unknown, field: string): boolean {
  if (typeof v !== "boolean") {
    throw new SerializationError(`Expected boolean for field "${field}", got ${typeof v}`);
  }
  return v;
}

/**
 * Throws if `id` is not `null` and is not registered in `known`. Used to
 * catch a save that references a def (unit/terrain/civ/tech/building) the
 * loaded ruleset no longer defines, instead of failing far from the cause.
 */
export function assertKnownDefId(
  id: DefId | null,
  known: Map<DefId, unknown>,
  field: string,
): void {
  if (id !== null && !known.has(id)) {
    throw new SerializationError(`Unknown defId for field "${field}": ${id}`);
  }
}
