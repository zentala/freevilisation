import type { GameState } from "./game-state.js";
import type { Command, CommandResult } from "./commands/types.js";
import { applyCommand } from "./commands/pipeline.js";
import { EventBus } from "./event-bus.js";

export class GameSession {
  #state: GameState;
  #commandLog: Command[] = [];
  #bus: EventBus;

  constructor(initialState: GameState, bus?: EventBus) {
    this.#state = initialState;
    this.#bus = bus ?? new EventBus();
  }

  get state(): GameState {
    return this.#state;
  }

  get bus(): EventBus {
    return this.#bus;
  }

  get commandLog(): readonly Command[] {
    return this.#commandLog;
  }

  dispatch(command: Command): CommandResult {
    const result = applyCommand(this.#state, command);
    if (!result.ok) {
      return result;
    }
    this.#state = result.state;
    this.#commandLog.push(command);
    this.#bus.emit(result.events);
    return result;
  }
}
