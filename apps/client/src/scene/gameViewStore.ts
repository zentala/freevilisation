import type { CityId, GameState } from "@freevilisation/engine";
import { create } from "zustand";

export interface GameViewStore {
  readonly gameState: GameState | null;
  setGameState: (gameState: GameState | null) => void;
  cityPopulation: (cityId: CityId) => number | undefined;
}

/** Client-facing snapshot used by renderers; it keeps engine state immutable at the view boundary. */
export const useGameViewStore = create<GameViewStore>((set, get) => ({
  gameState: null,
  setGameState: (gameState) => set({ gameState }),
  cityPopulation: (cityId) => get().gameState?.entities.cities[cityId]?.population,
}));

export function selectCityPopulation(view: Pick<GameViewStore, "gameState">, cityId: CityId): number | undefined {
  return view.gameState?.entities.cities[cityId]?.population;
}
