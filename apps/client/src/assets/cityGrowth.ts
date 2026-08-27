import type { PrimitiveShape, PrimitiveSpec } from "@freevilisation/content";

export interface CityGrowthVisual {
  readonly scale: number;
  readonly height: number;
  readonly footprint: number;
  readonly extraShapes: number;
}

const MAX_POPULATION = 8;

/** Maps population to bounded, legible changes in a city placeholder. */
export function cityGrowthVisual(population: number): CityGrowthVisual {
  const normalized = Math.max(0, Math.min(population, MAX_POPULATION) - 1) / (MAX_POPULATION - 1);
  return {
    scale: 1 + normalized * 0.35,
    height: 1 + normalized * 0.8,
    footprint: 1 + normalized * 0.25,
    extraShapes: Math.floor(normalized * 3),
  };
}

function scaleShape(shape: PrimitiveShape, growth: CityGrowthVisual): PrimitiveShape {
  const [x, y, z] = shape.scale ?? [1, 1, 1];
  const position = shape.position ?? [0, 0, 0];
  return {
    ...shape,
    scale: [x * growth.footprint, y * growth.height, z * growth.footprint],
    position: [position[0], position[1] * growth.height, position[2]],
  };
}

/** Applies population growth to a resolved city composition without mutating the manifest. */
export function scaleCitySpec(spec: PrimitiveSpec, population: number): PrimitiveSpec {
  const growth = cityGrowthVisual(population);
  const shapes = spec.shapes.map((shape) => scaleShape(shape, growth));
  for (let index = 0; index < growth.extraShapes; index += 1) {
    const size = 0.22 + index * 0.04;
    shapes.push({
      kind: "box",
      scale: [size, size * growth.height, size],
      position: [(index - 1) * 0.3, size * growth.height, 0.28],
    });
  }
  return { shapes };
}
