import { EventBus, type CommandResult } from "@freevilisation/engine";
import { describe, expect, it, vi } from "vitest";
import { NotificationQueue } from "./NotificationQueue";

describe("NotificationQueue", () => {
  it("turns EventBus events into notifications and stops after disposal", () => {
    const bus = new EventBus();
    const queue = new NotificationQueue(bus);
    const listener = vi.fn();
    queue.subscribe(listener);

    bus.emit([{ kind: "TurnStarted", turn: 3, activePlayerId: null }]);
    expect(queue.toasts).toEqual([{ id: "toast-0", message: "Turn 3 started.", tone: "info" }]);
    expect(listener).toHaveBeenCalledOnce();

    queue.dispose();
    bus.emit([{ kind: "TurnEnded", turn: 3, activePlayerId: null }]);
    expect(queue.toasts).toHaveLength(1);
  });

  it("adds an error notification only for rejected command results", () => {
    const queue = new NotificationQueue(new EventBus());
    const rejection: CommandResult = {
      ok: false,
      reason: { code: "illegal", message: "This unit has no movement points." },
    };

    queue.notifyCommandResult(rejection);
    expect(queue.toasts[0]).toMatchObject({
      message: "This unit has no movement points.",
      tone: "error",
    });
  });

  it("allows a notification to be dismissed by id", () => {
    const queue = new NotificationQueue(new EventBus());
    const toastId = queue.push("Saved.", "success");
    queue.dismiss(toastId);
    expect(queue.toasts).toEqual([]);
  });
});
