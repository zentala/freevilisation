import type { GameState } from "../game-state.js";
import type { Command, CommandRejection, CommandResult, GameEvent } from "./types.js";
import { refreshUnitMoves, type TurnSystem } from "../systems/refresh-unit-moves.js";
import { runUpkeep } from "../turn/upkeep.js";
import { runGrowthProduction } from "../turn/growth-production.js";
import { runResearch } from "../turn/research.js";
import { resolveVictory, type VictoryChecker } from "../turn/victory.js";

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
  checkVictory: VictoryChecker = () => null,
): CommandResult {
  if (state.settings.simultaneousTurns) {
    return handleSimultaneousEndTurn(state, command, checkVictory);
  }

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

  const victory = resolveVictory({ ...systemState, phase: "playing" }, checkVictory);
  const finalState: GameState = victory.state;

  const events: GameEvent[] = [
    turnEndedEvent,
    ...systemEvents,
    ...victory.events,
    { kind: "TurnStarted", turn: nextTurn, activePlayerId: nextActivePlayerId },
  ];

  return {
    ok: true,
    state: finalState,
    events,
  };
}

function handleSimultaneousEndTurn(
  state: GameState,
  command: Command & { kind: "EndTurn" },
  checkVictory: VictoryChecker,
): CommandResult {
  const submitted = new Set(state.submittedEndTurnPlayerIds ?? []);
  submitted.add(command.playerId);
  if (submitted.size < state.playerOrder.length) {
    return {
      ok: true,
      state: { ...state, activePlayerId: null, submittedEndTurnPlayerIds: [...submitted].sort() },
      events: [],
    };
  }

  const resolutionState: GameState = {
    ...state,
    turn: state.turn + 1,
    activePlayerId: null,
    phase: "turn_resolution",
    submittedEndTurnPlayerIds: [],
  };
  let systemState = resolutionState;
  const systemEvents: GameEvent[] = [];
  for (const system of TURN_SYSTEMS) {
    const result = system(systemState, command.playerId);
    systemState = result.state;
    systemEvents.push(...result.events);
  }
  const victory = resolveVictory({ ...systemState, phase: "playing" }, checkVictory);
  return {
    ok: true,
    state: victory.state,
    events: [
      { kind: "TurnEnded", turn: state.turn, activePlayerId: null },
      ...systemEvents,
      ...victory.events,
      { kind: "TurnStarted", turn: state.turn + 1, activePlayerId: null },
    ],
  };
}
