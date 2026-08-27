import type { EntityId, EventBus, GameEvent } from "@freevilisation/engine";
import { axialToWorld } from "../hexMath";
import { Vector3 } from "three";

export interface Tween {
  readonly from: Vector3;
  readonly to: Vector3;
  readonly startedAt: number;
  readonly durationMs: number;
}

export interface AnimationSystemOptions {
  readonly durationMs?: number;
  readonly now?: () => number;
}

/** Event-driven transform tween queue consumed by entity renderers. */
export class AnimationSystem {
  readonly #tweens = new Map<EntityId, Tween[]>();
  readonly #now: () => number;
  readonly #durationMs: number;
  readonly #unsubscribe: () => void;
  #time = 0;

  constructor(eventBus: EventBus, options: AnimationSystemOptions = {}) {
    this.#now = options.now ?? (() => performance.now());
    this.#durationMs = options.durationMs ?? 300;
    this.#time = this.#now();
    this.#unsubscribe = eventBus.on((event) => this.#handleEvent(event));
  }

  /** Returns the interpolated transform at the current animation clock. */
  getCurrentTransform(id: EntityId): Vector3 | undefined {
    this.#time = this.#now();
    return this.#transformAt(id, this.#time);
  }

  /** Advances the animation clock, useful for render loops and deterministic tests. */
  update(now = this.#now()): void {
    this.#time = now;
    for (const id of this.#tweens.keys()) this.#transformAt(id, now);
  }

  /** Stops listening to engine events and releases queued animations. */
  dispose(): void {
    this.#unsubscribe();
    this.#tweens.clear();
  }

  #handleEvent(event: GameEvent): void {
    if (event.kind !== "UnitMoved") return;
    const queue = this.#tweens.get(event.unitId) ?? [];
    const from = queue.at(-1)?.to ?? axialToWorld(parseCoord(event.from));
    const to = axialToWorld(parseCoord(event.to));
    const last = queue.at(-1);
    const startedAt = last === undefined ? this.#time : tweenEnd(last);
    queue.push({ from, to, startedAt, durationMs: this.#durationMs });
    this.#tweens.set(event.unitId, queue);
  }

  #transformAt(id: EntityId, now: number): Vector3 | undefined {
    const queue = this.#tweens.get(id);
    if (!queue || queue.length === 0) return undefined;
    while (queue.length > 1 && now >= tweenEnd(queue[0]!)) queue.shift();
    const tween = queue[0]!;
    if (now >= tweenEnd(tween)) {
      this.#tweens.delete(id);
      return tween.to.clone();
    }
    const progress = Math.max(0, Math.min(1, (now - tween.startedAt) / tween.durationMs));
    return tween.from.clone().lerp(tween.to, progress);
  }
}

function parseCoord(key: string): { q: number; r: number } {
  const [q, r] = key.split(",").map(Number);
  return { q: q ?? 0, r: r ?? 0 };
}

function tweenEnd(tween: Tween): number {
  return tween.startedAt + tween.durationMs;
}
