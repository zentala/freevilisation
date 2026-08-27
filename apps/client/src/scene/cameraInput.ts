export type PanVector = {
  x: number;
  z: number;
};

const KEYBOARD_DIRECTIONS: Record<string, PanVector> = {
  a: { x: -1, z: 0 },
  ArrowLeft: { x: -1, z: 0 },
  d: { x: 1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  w: { x: 0, z: -1 },
  ArrowUp: { x: 0, z: -1 },
  s: { x: 0, z: 1 },
  ArrowDown: { x: 0, z: 1 },
};

export function getKeyboardPan(keys: ReadonlySet<string>): PanVector {
  const pan = { x: 0, z: 0 };
  for (const key of keys) {
    const direction = KEYBOARD_DIRECTIONS[key];
    if (direction) {
      pan.x += direction.x;
      pan.z += direction.z;
    }
  }
  return normalizePan(pan);
}

export function getEdgePan(
  clientX: number,
  clientY: number,
  rect: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  threshold = 32,
): PanVector {
  if (threshold <= 0) return { x: 0, z: 0 };
  const left = Math.max(0, (rect.left + threshold - clientX) / threshold);
  const right = Math.max(0, (clientX - rect.right + threshold) / threshold);
  const top = Math.max(0, (rect.top + threshold - clientY) / threshold);
  const bottom = Math.max(0, (clientY - rect.bottom + threshold) / threshold);
  return normalizePan({
    x: Math.min(1, right) - Math.min(1, left),
    z: Math.min(1, bottom) - Math.min(1, top),
  });
}

function normalizePan(pan: PanVector): PanVector {
  const length = Math.hypot(pan.x, pan.z);
  if (length <= 1) return pan;
  return { x: pan.x / length, z: pan.z / length };
}
