import type { GameState, HexKey } from "@freevilisation/engine";
import { findPath } from "@freevilisation/engine";

/** Delegates hover path calculation to the deterministic engine search. */
export function previewPath(
  state: GameState | null,
  from: HexKey | null,
  to: HexKey | null,
): HexKey[] {
  if (!state || !from || !to) return [];
  return findPath(state, from, to) ?? [];
}
