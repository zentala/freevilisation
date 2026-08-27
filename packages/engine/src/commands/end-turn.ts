import type { GameState } from "../game-state.js";
import type { Command, CommandRejection, CommandResult, GameEvent } from "./types.js";
import { refreshUnitMoves, type TurnSystem } from "../systems/refresh-unit-moves.js";
import { runUpkeep } from "../turn/upkeep.js";
import { runGrowthProduction } from "../turn/growth-production.js";
import { runResearch } from "../turn/research.js";

const TURN_SYSTEMS: TurnSystem[] = [
  (state, playerId) => runUpkeep(state, playerId),
  refreshUnitMoves,
  (state) => runGrowthProduction(state),
  (state, playerId) => runResearch(state, playerId),
];

/** Validates the command-specific preconditions for ending a turn. */
export function validateEndTurn(
  state: GameState,
  command: Command & { kind: "EndTurn" },
): CommandRejection | null {
  if (state.playerOrder.length === 0) {
    return { code: "illegal", message: "Cannot end a turn without players" };
  }

  if (!state.playerOrder.includes(command.playerId)) {
    return {
      code: "unknown_entity",
      message: `Player is not in the turn order: ${command.playerId}`,
    };
  }

  return null;
}

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
