export interface ShortcutEvent {
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly shiftKey?: boolean;
  readonly metaKey?: boolean;
  preventDefault?: () => void;
}

export interface ShortcutBinding {
  readonly id: string;
  readonly shortcut: string;
  readonly handler: () => void;
}

function normalizeShortcut(shortcut: string): string {
  return shortcut
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join("+");
}

function eventShortcut(event: ShortcutEvent): string {
  const modifiers = [
    event.altKey ? "alt" : "",
    event.ctrlKey ? "ctrl" : "",
    event.metaKey ? "meta" : "",
    event.shiftKey ? "shift" : "",
    event.key.toLowerCase(),
  ].filter(Boolean);
  return normalizeShortcut(modifiers.join("+"));
}

/** Binds conflict-free keyboard intents to UI or command-layer callbacks. */
export class ShortcutManager {
  private readonly bindings = new Map<string, ShortcutBinding>();

  public register(binding: ShortcutBinding): () => void {
    const shortcut = normalizeShortcut(binding.shortcut);
    const existing = this.bindings.get(shortcut);
    if (existing && existing.id !== binding.id)
      throw new Error(`Shortcut already registered: ${binding.shortcut}`);
    this.bindings.set(shortcut, { ...binding, shortcut });
    return () => this.unregister(binding.id);
  }

  public unregister(id: string): void {
    for (const [shortcut, binding] of this.bindings) {
      if (binding.id === id) this.bindings.delete(shortcut);
    }
  }

  public dispatch(shortcut: string): boolean {
    const binding = this.bindings.get(normalizeShortcut(shortcut));
    if (!binding) return false;
    binding.handler();
    return true;
  }

  public handleKeyDown(event: ShortcutEvent): boolean {
    const dispatched = this.dispatch(eventShortcut(event));
    if (dispatched) event.preventDefault?.();
    return dispatched;
  }
}
