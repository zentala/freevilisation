export interface RngState {
  readonly algorithm: "mulberry32";
  state: number;
  drawCount: number;
}

export interface Prng {
  next(): number;
  fork(label: string): Prng;
  state(): RngState;
}

function mulberry32Step(s: number): number {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

function fnv1a(str: string, seed: number): number {
  let h = seed ^ 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
  }
  return h;
}

class PrngImpl implements Prng {
  private _state: number;
  private _drawCount: number;

  constructor(state: number, drawCount: number) {
    this._state = state;
    this._drawCount = drawCount;
  }

  next(): number {
    this._state = mulberry32Step(this._state);
    this._drawCount++;
    return this._state / 0x100000000;
  }

  fork(label: string): Prng {
    const childSeed = fnv1a(label, this._state);
    return new PrngImpl(childSeed, 0);
  }

  state(): RngState {
    return {
      algorithm: "mulberry32",
      state: this._state,
      drawCount: this._drawCount,
    };
  }
}

export function createPrng(seed: number): Prng {
  return new PrngImpl(seed | 0, 0);
}

export function restorePrng(rngState: RngState): Prng {
  return new PrngImpl(rngState.state, rngState.drawCount);
}
