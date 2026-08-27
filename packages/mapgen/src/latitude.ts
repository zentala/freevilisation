/**
 * Latitude weight for a row: 1 at the equator, 0 at either pole, linear
 * falloff. Shared by any stage whose output varies by latitude — landmass's
 * pole-biased elevation and climate's temperature both use this same shape,
 * so it lives here instead of being duplicated in each stage.
 */
export function equatorWeight(r: number, height: number): number {
  const equator = (height - 1) / 2;
  const halfHeight = height / 2;
  return 1 - Math.abs(r - equator) / halfHeight;
}
