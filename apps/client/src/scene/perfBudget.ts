export interface FrameBudgetResult {
  readonly frames: number;
  readonly averageFps: number;
  readonly minimumFps: number;
  readonly passed: boolean;
}

/** Evaluates a requestAnimationFrame sample against the renderer budget. */
export function evaluateFrameBudget(
  frameDurationsMs: readonly number[],
  minimumFps = 30,
): FrameBudgetResult {
  if (frameDurationsMs.length === 0) throw new Error("at least one frame is required");
  if (minimumFps <= 0) throw new Error("minimumFps must be positive");
  const fps = frameDurationsMs.map((duration) => {
    if (duration <= 0) throw new Error("frame durations must be positive");
    return 1_000 / duration;
  });
  const averageFps = fps.reduce((sum, value) => sum + value, 0) / fps.length;
  return {
    frames: fps.length,
    averageFps,
    minimumFps: Math.min(...fps),
    passed: Math.min(...fps) >= minimumFps,
  };
}
