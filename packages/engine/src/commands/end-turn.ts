import type { GameState } from "../game-state.js";
import type { Command, CommandResult, GameEvent } from "./types.js";
import { refreshUnitMoves, type TurnSystem } from "../systems/refresh-unit-moves.js";

const TURN_SYSTEMS: TurnSystem[] = [refreshUnitMoves];

export function handleEndTurn(
  state: GameState,
  command: Command & { kind: "EndTurn" },
): CommandResult {
  const currentIndex = state.playerOrder.indexOf(command.playerId);
  const nextIndex = (currentIndex + 1) % state.playerOrder.length;
  const wrap = nextIndex === 0;
  const nextTurn = wrap ? state.turn + 1 : state.turn;
  const nextActivePlayerId = state.playerOrder[nextIndex] ?? null;

  const turnEndedEvent: GameEvent = {
    kind: "TurnEnded",
    turn: state.turn,
    activePlayerId: command.playerId,
  };

  const resolutionState: GameState = {
    ...state,
    turn: nextTurn,
    activePlayerId: nextActivePlayerId,
    phase: "turn_resolution",
  };

  let systemState = resolutionState;
  const systemEvents: GameEvent[] = [];
  for (const system of TURN_SYSTEMS) {
    const result = system(systemState, nextActivePlayerId!);
    systemState = result.state;
    systemEvents.push(...result.events);
  }

  const finalState: GameState = { ...systemState, phase: "playing" };

  const events: GameEvent[] = [
    turnEndedEvent,
    ...systemEvents,
    { kind: "TurnStarted", turn: nextTurn, activePlayerId: nextActivePlayerId },
  ];

  return {
    ok: true,
    state: finalState,
    events,
  };
}
