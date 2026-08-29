import type { CommandResult, EventBus, GameEvent } from "@freevilisation/engine";

export type NotificationTone = "info" | "success" | "warning" | "error";

export interface NotificationToast {
  readonly id: string;
  readonly message: string;
  readonly tone: NotificationTone;
}

export type NotificationListener = () => void;

/** Client-side toast state fed by gameplay events and rejected commands. */
export class NotificationQueue {
  #toasts: readonly NotificationToast[] = [];
  #listeners = new Set<NotificationListener>();
  #nextId = 0;
  readonly #unsubscribe: () => void;

  constructor(eventBus: EventBus) {
    this.#unsubscribe = eventBus.on((event) => this.push(eventMessage(event), eventTone(event)));
  }

  get toasts(): readonly NotificationToast[] {
    return this.#toasts;
  }

  subscribe(listener: NotificationListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  push(message: string, tone: NotificationTone = "info"): string {
    const id = `toast-${this.#nextId++}`;
    this.#toasts = [...this.#toasts, { id, message, tone }];
    this.#notify();
    return id;
  }

  notifyCommandResult(result: CommandResult): void {
    if (!result.ok) this.push(result.reason.message, "error");
  }

  dismiss(id: string): void {
    const nextToasts = this.#toasts.filter((toast) => toast.id !== id);
    if (nextToasts.length === this.#toasts.length) return;
    this.#toasts = nextToasts;
    this.#notify();
  }

  dispose(): void {
    this.#unsubscribe();
    this.#listeners.clear();
  }

  #notify(): void {
    for (const listener of this.#listeners) listener();
  }
}

function eventMessage(event: GameEvent): string {
  switch (event.kind) {
    case "TurnStarted":
      return `Turn ${event.turn} started.`;
    case "TurnEnded":
      return `Turn ${event.turn} ended.`;
    case "UnitMoved":
      return "Unit moved.";
    case "CityFounded":
      return "City founded.";
    case "CityGrew":
      return "City grew.";
    case "ProductionCompleted":
      return "Production completed.";
    case "TechResearched":
      return "Technology researched.";
    case "TileExplored":
      return "Tile explored.";
    case "ResourceDiscovered":
      return "Resource discovered.";
    case "CivilizationDiscovered":
      return "Civilization discovered.";
    case "GameOver":
      return "Game over.";
    case "UnitAttacked":
      return "Unit attacked.";
  }
}

function eventTone(event: GameEvent): NotificationTone {
  return event.kind === "GameOver" ? "warning" : "info";
}
