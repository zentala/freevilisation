import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./event-bus.js";
import type { GameEvent } from "./commands/types.js";
import type { HexKey, UnitId } from "./ids.js";

function moved(from: string, to: string): GameEvent {
  return { kind: "UnitMoved", unitId: "u1" as UnitId, from: from as HexKey, to: to as HexKey, movesRemaining: 0 };
}

describe("EventBus", () => {
  it("one listener gets every event in array order", () => {
    const bus = new EventBus();
    const received: GameEvent[] = [];
    bus.on((e) => received.push(e));

    const e1 = moved("0,0", "1,0");
    const e2 = moved("1,0", "2,0");
    bus.emit([e1, e2]);

    expect(received).toEqual([e1, e2]);
  });

  it("two listeners both fire, in subscription order", () => {
    const bus = new EventBus();
    const order: number[] = [];
    bus.on(() => order.push(1));
    bus.on(() => order.push(2));

    bus.emit([moved("0,0", "1,0")]);
    expect(order).toEqual([1, 2]);
  });

  it("the unsubscribe closure stops delivery", () => {
    const bus = new EventBus();
    const spy = vi.fn();
    const unsub = bus.on(spy);

    unsub();
    bus.emit([moved("0,0", "1,0")]);
    expect(spy).not.toHaveBeenCalled();
  });

  it("unsubscribing from inside a listener does not skip the other listeners", () => {
    const bus = new EventBus();
    const order: number[] = [];

    const unsub2 = bus.on(() => {
      order.push(1);
      unsub2();
    });
    bus.on(() => order.push(2));

    bus.emit([moved("0,0", "1,0")]);
    expect(order).toEqual([1, 2]);
  });

  it("a throwing listener does not prevent the next listener or the next event", () => {
    const bus = new EventBus();
    const received: GameEvent[] = [];

    bus.on(() => {
      throw new Error("boom");
    });
    bus.on((e) => received.push(e));

    const e1 = moved("0,0", "1,0");
    const e2 = moved("1,0", "2,0");
    bus.emit([e1, e2]);

    expect(received).toEqual([e1, e2]);
  });

  it("clear() drops everything", () => {
    const bus = new EventBus();
    const spy = vi.fn();
    bus.on(spy);

    bus.clear();
    bus.emit([moved("0,0", "1,0")]);
    expect(spy).not.toHaveBeenCalled();
  });
});
