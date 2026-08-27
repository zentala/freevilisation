import { describe, expect, it } from "vitest";
import type { UnitId } from "@freevilisation/engine";
import { nextIdleUnit } from "./unitCycling";

const id = (value: string) => value as UnitId;

describe("nextIdleUnit", () => {
  const units = [
    { id: id("unit-b"), movesLeft: 2 },
    { id: id("unit-a"), movesLeft: 0 },
    { id: id("unit-c"), movesLeft: 1 },
  ];

  it("cycles idle units in stable order and wraps", () => {
    expect(nextIdleUnit(units, null)).toBe(id("unit-b"));
    expect(nextIdleUnit(units, id("unit-b"))).toBe(id("unit-c"));
    expect(nextIdleUnit(units, id("unit-c"))).toBe(id("unit-b"));
  });

  it("returns null when no unit is idle", () => {
    expect(nextIdleUnit([{ id: id("unit-a"), movesLeft: 0 }], null)).toBeNull();
  });
});
