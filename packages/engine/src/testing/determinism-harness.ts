/**
 * Determinism harness — verifies that replaying the same commands through
 * fresh GameSessions from the same factory always produces the same state hash.
 *
 * Usage in test files:
 *
 *   import { replay, assertDeterministic } from "@freevilisation/engine";
 *   import { myFixture } from "./fixtures.js";
 *
 *   it("is deterministic", () => {
 *     assertDeterministic(myFixture, [
 *       { kind: "MoveUnit", playerId: "p1", unitId: "u1", path: ["1,0"] },
 *       { kind: "EndTurn", playerId: "p1" },
 *     ]);
 *   });
 */

import type { GameState } from "../game-state.js";
import type { Command, GameEvent } from "../commands/types.js";
import { GameSession } from "../game-session.js";
import { stateHash } from "../serialization.js";

export interface DeterminismRun {
  readonly hash: string;
  /** State hash after each command, in dispatch order. */
  readonly stepHashes: readonly string[];
  readonly finalState: GameState;
  readonly events: GameEvent[];
}

export function replay(makeState: () => GameState, commands: Command[]): DeterminismRun {
  const session = new GameSession(makeState());
  const allEvents: GameEvent[] = [];
  const stepHashes: string[] = [];

  for (const cmd of commands) {
    const result = session.dispatch(cmd);
    if (result.ok) {
      allEvents.push(...result.events);
    }
    stepHashes.push(stateHash(session.state));
  }

  return {
    hash: stateHash(session.state),
    stepHashes,
    finalState: session.state,
    events: allEvents,
  };
}

export function assertDeterministic(makeState: () => GameState, commands: Command[]): void {
  const run1 = replay(makeState, commands);
  const run2 = replay(makeState, commands);

  for (let i = 0; i < run1.stepHashes.length; i++) {
    if (run1.stepHashes[i] !== run2.stepHashes[i]) {
      throw new Error(
        `Determinism violated at command index ${i} (${commands[i]?.kind}): ` +
          `${run1.stepHashes[i]} !== ${run2.stepHashes[i]}`,
      );
    }
  }

  if (run1.hash !== run2.hash) {
    throw new Error(`Determinism violated: final hash ${run1.hash} !== ${run2.hash}`);
  }
}
