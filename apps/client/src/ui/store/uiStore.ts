import { create } from "zustand";

export type PanelId = string;
export type UiIntentKind = "unit" | "city" | "tile" | "definition";

export interface UiIntent {
  readonly kind: UiIntentKind;
  readonly id: string;
}

export interface ClientSettings {
  readonly soundEnabled: boolean;
  readonly reducedMotion: boolean;
  readonly showGrid: boolean;
}

export interface UiStore {
  readonly openPanel: PanelId | null;
  readonly hovered: UiIntent | null;
  readonly selected: UiIntent | null;
  readonly settings: ClientSettings;
  open: (panel: PanelId) => void;
  close: () => void;
  toggle: (panel: PanelId) => void;
  setHovered: (intent: UiIntent | null) => void;
  setSelected: (intent: UiIntent | null) => void;
  updateSettings: (settings: Partial<ClientSettings>) => void;
}

const defaultSettings: ClientSettings = {
  soundEnabled: true,
  reducedMotion: false,
  showGrid: true,
};

export const useUiStore = create<UiStore>((set, get) => ({
  openPanel: null,
  hovered: null,
  selected: null,
  settings: defaultSettings,
  open: (openPanel) => set({ openPanel }),
  close: () => set({ openPanel: null }),
  toggle: (panel) => set({ openPanel: get().openPanel === panel ? null : panel }),
  setHovered: (hovered) => set({ hovered }),
  setSelected: (selected) => set({ selected }),
  updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
}));
