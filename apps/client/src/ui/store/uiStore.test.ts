import { describe, expect, it } from "vitest";
import { useUiStore, type UiStore } from "./uiStore";

function resetStore(): void {
  useUiStore.setState({
    openPanel: null,
    hovered: null,
    selected: null,
    settings: { soundEnabled: true, reducedMotion: false, showGrid: true },
  });
}

function state(): UiStore {
  return useUiStore.getState();
}

describe("uiStore", () => {
  it("keeps panel state independent and supports toggling", () => {
    resetStore();
    state().open("city");
    expect(state().openPanel).toBe("city");
    state().toggle("city");
    expect(state().openPanel).toBeNull();
    state().toggle("tech");
    expect(state().openPanel).toBe("tech");
    state().close();
    expect(state().openPanel).toBeNull();
  });

  it("stores hover and selection intents as separate values", () => {
    resetStore();
    const unit = { kind: "unit" as const, id: "unit-1" };
    const tile = { kind: "tile" as const, id: "2,3" };
    state().setHovered(tile);
    state().setSelected(unit);
    expect(state().hovered).toEqual(tile);
    expect(state().selected).toEqual(unit);
    state().setHovered(null);
    expect(state().hovered).toBeNull();
    expect(state().selected).toEqual(unit);
  });

  it("updates client settings without replacing unrelated values", () => {
    resetStore();
    state().updateSettings({ reducedMotion: true });
    expect(state().settings).toEqual({ soundEnabled: true, reducedMotion: true, showGrid: true });
    state().updateSettings({ soundEnabled: false, showGrid: false });
    expect(state().settings).toEqual({ soundEnabled: false, reducedMotion: true, showGrid: false });
  });
});
