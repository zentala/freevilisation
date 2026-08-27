import { describe, expect, it, vi } from "vitest";
import { ShortcutManager } from "./ShortcutManager";

describe("ShortcutManager", () => {
  it("registers and dispatches a normalized shortcut", () => {
    const manager = new ShortcutManager();
    const handler = vi.fn();
    manager.register({ id: "end-turn", shortcut: "Ctrl+Enter", handler });
    const preventDefault = vi.fn();
    expect(manager.handleKeyDown({ key: "Enter", ctrlKey: true, preventDefault })).toBe(true);
    expect(handler).toHaveBeenCalledOnce();
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it("rejects conflicts at registration time", () => {
    const manager = new ShortcutManager();
    manager.register({ id: "first", shortcut: "Escape", handler: vi.fn() });
    expect(() => manager.register({ id: "second", shortcut: "escape", handler: vi.fn() })).toThrow("Shortcut already registered");
  });

  it("supports unregistering and reports unhandled shortcuts", () => {
    const manager = new ShortcutManager();
    const handler = vi.fn();
    const remove = manager.register({ id: "menu", shortcut: "M", handler });
    expect(manager.dispatch("m")).toBe(true);
    remove();
    expect(manager.dispatch("m")).toBe(false);
    expect(handler).toHaveBeenCalledOnce();
  });
});
