import type { UnitId } from "@freevilisation/engine";

export interface IdleUnitCandidate {
  readonly id: UnitId;
  readonly movesLeft: number;
}

/** Selects the next idle unit in stable id order, wrapping at the end. */
export function nextIdleUnit(
  units: readonly IdleUnitCandidate[],
  selectedId: UnitId | null,
): UnitId | null {
  const idle = units
    .filter((unit) => unit.movesLeft > 0)
    .sort((a, b) => (a.id as string).localeCompare(b.id as string));
  if (idle.length === 0) return null;
  const selectedIndex = idle.findIndex((unit) => unit.id === selectedId);
  return idle[(selectedIndex + 1 + idle.length) % idle.length]!.id;
}
