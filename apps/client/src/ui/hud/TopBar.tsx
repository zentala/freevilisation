import type { GameState, Player } from "@freevilisation/engine";
import type { ReactElement } from "react";
import { useGameViewStore } from "../../scene/gameViewStore";

export interface TopBarValues {
  readonly turn: number;
  readonly gold: number;
  readonly goldPerTurn: number;
  readonly sciencePerTurn: number;
  readonly culturePerTurn: number;
}

function activePlayer(state: GameState): Player | undefined {
  return state.activePlayerId ? state.players[state.activePlayerId] : undefined;
}

/** Derives display-only economy values from the immutable game-view snapshot. */
export function selectTopBarValues(state: GameState | null): TopBarValues {
  const player = state ? activePlayer(state) : undefined;
  return {
    turn: state?.turn ?? 0,
    gold: player?.gold ?? 0,
    goldPerTurn: player?.goldPerTurn ?? 0,
    sciencePerTurn: 0,
    culturePerTurn: player?.culturePerTurn ?? 0,
  };
}

function Yield({
  label,
  value,
  rate,
}: {
  readonly label: string;
  readonly value: number;
  readonly rate?: number;
}): ReactElement {
  return (
    <span aria-label={`${label} ${value}`} className="flex items-center gap-1">
      <span>{label}</span>
      <strong>{value}</strong>
      {rate !== undefined && <small className="text-slate-300">(+{rate})</small>}
    </span>
  );
}

/** Persistent top bar wired only to gameViewStore selectors. */
export function TopBar(): ReactElement {
  const values = useGameViewStore((view) => selectTopBarValues(view.gameState));
  return (
    <div
      aria-label="Game status"
      className="pointer-events-auto flex flex-wrap gap-2 sm:gap-4 rounded-lg bg-slate-950/85 px-2 sm:px-4 py-2 text-xs sm:text-sm text-white shadow-lg"
    >
      <span aria-label={`Turn ${values.turn}`}>Turn {values.turn}</span>
      <Yield label="Gold" value={values.gold} rate={values.goldPerTurn} />
      <Yield label="Science" value={values.sciencePerTurn} />
      <Yield label="Culture" value={values.culturePerTurn} />
    </div>
  );
}
