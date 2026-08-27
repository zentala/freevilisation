import { EventBus } from "@freevilisation/engine";
import type { HexKey, UnitId } from "@freevilisation/engine";
import { describe, expect, it } from "vitest";
import { AnimationSystem } from "./AnimationSystem";

const UNIT = "ent_unit" as UnitId;

describe("AnimationSystem", () => {
  it("queues UnitMoved and interpolates its world transform", () => {
    let now = 100;
    const bus = new EventBus();
    const animations = new AnimationSystem(bus, { durationMs: 200, now: () => now });
    bus.emit([{ kind: "UnitMoved", unitId: UNIT, from: "0,0" as HexKey, to: "1,0" as HexKey, movesRemaining: 2 }]);

    now = 200;
    expect(animations.getCurrentTransform(UNIT)?.x).toBeCloseTo(Math.sqrt(3) / 2);
    now = 300;
    expect(animations.getCurrentTransform(UNIT)?.x).toBeCloseTo(Math.sqrt(3));
    animations.dispose();
  });

  it("chains consecutive moves from the prior destination", () => {
    let now = 0;
    const bus = new EventBus();
    const animations = new AnimationSystem(bus, { durationMs: 100, now: () => now });
    bus.emit([{ kind: "UnitMoved", unitId: UNIT, from: "0,0" as HexKey, to: "1,0" as HexKey, movesRemaining: 1 }]);
    bus.emit([{ kind: "UnitMoved", unitId: UNIT, from: "1,0" as HexKey, to: "2,0" as HexKey, movesRemaining: 0 }]);

    now = 150;
    expect(animations.getCurrentTransform(UNIT)?.x).toBeCloseTo(Math.sqrt(3) * 1.5);
    animations.dispose();
  });

  it("returns undefined for entities without an animation", () => {
    const animations = new AnimationSystem(new EventBus(), { now: () => 0 });
    expect(animations.getCurrentTransform(UNIT)).toBeUndefined();
    animations.dispose();
  });
});
