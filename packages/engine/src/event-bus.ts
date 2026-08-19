import type { GameEvent } from "./commands/types.js";

export type EventListener = (event: GameEvent) => void;

export class EventBus {
  #listeners = new Map<number, EventListener>();
  #nextId = 0;

  on(listener: EventListener): () => void {
    const id = this.#nextId++;
    this.#listeners.set(id, listener);
    return () => {
      this.#listeners.delete(id);
    };
  }

  emit(events: GameEvent[]): void {
    const snapshot = [...this.#listeners.values()];
    for (const event of events) {
      for (const listener of snapshot) {
        try {
          listener(event);
        } catch {
          // swallow — a renderer bug must not desync the engine
        }
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
