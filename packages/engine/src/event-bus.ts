import type { GameEvent } from "./commands/types.js";

export type EventListener = (event: GameEvent) => void;

/** Called when a listener throws during `emit`. See {@link EventBus}. */
export type ListenerErrorHandler = (error: unknown, event: GameEvent) => void;

export interface EventBusOptions {
  /**
   * Called when a listener throws. Optional — without it, a throwing
   * listener is silent (see {@link EventBus.emit}).
   */
  onListenerError?: ListenerErrorHandler;
}

export class EventBus {
  #listeners = new Map<number, EventListener>();
  #nextId = 0;
  #onListenerError: ListenerErrorHandler | undefined;

  constructor(options?: EventBusOptions) {
    this.#onListenerError = options?.onListenerError;
  }

  on(listener: EventListener): () => void {
    const id = this.#nextId++;
    this.#listeners.set(id, listener);
    return () => {
      this.#listeners.delete(id);
    };
  }

  /**
   * Delivers every event to every listener, in order. A listener that
   * throws never stops the engine or the remaining listeners — the
   * exception is caught and, if `onListenerError` was set, reported through
   * it, so a live renderer bug is visible instead of an event that
   * silently never arrived.
   */
  emit(events: GameEvent[]): void {
    const snapshot = [...this.#listeners.values()];
    for (const event of events) {
      for (const listener of snapshot) {
        try {
          listener(event);
        } catch (error) {
          this.#onListenerError?.(error, event);
        }
      }
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}
