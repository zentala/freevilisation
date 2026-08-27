import type { EntityId } from "@freevilisation/engine";

export interface FadeTween { readonly startedAt: number; readonly durationMs: number; readonly from: number; readonly to: number; }

export function fadeOpacity(tween: FadeTween, now: number): number {
  if (tween.durationMs <= 0 || now >= tween.startedAt + tween.durationMs) return tween.to;
  const progress = Math.max(0, Math.min(1, (now - tween.startedAt) / tween.durationMs));
  return tween.from + (tween.to - tween.from) * progress;
}

/** Tracks visual fades; removal is requested only after opacity reaches zero. */
export class FadeSystem {
  readonly #fades = new Map<EntityId, FadeTween>();
  readonly #durationMs: number;

  constructor(durationMs = 250) { this.#durationMs = durationMs; }

  fadeIn(id: EntityId, now: number): void {
    this.#fades.set(id, { startedAt: now, durationMs: this.#durationMs, from: 0, to: 1 });
  }

  fadeOut(id: EntityId, now: number): void {
    this.#fades.set(id, { startedAt: now, durationMs: this.#durationMs, from: 1, to: 0 });
  }

  opacity(id: EntityId, now: number): number { return fadeOpacity(this.#fades.get(id) ?? { startedAt: 0, durationMs: 0, from: 1, to: 1 }, now); }

  update(now: number, remove: (id: EntityId) => void): void {
    for (const [id, tween] of this.#fades) {
      if (now >= tween.startedAt + tween.durationMs && tween.to === 0) { this.#fades.delete(id); remove(id); }
    }
  }
}
