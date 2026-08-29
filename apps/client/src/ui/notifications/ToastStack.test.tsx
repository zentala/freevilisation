import { EventBus } from "@freevilisation/engine";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationQueue } from "./NotificationQueue";
import { ToastStack } from "./ToastStack";

describe("ToastStack", () => {
  it("renders queued toasts with accessible dismiss controls", () => {
    const queue = new NotificationQueue(new EventBus());
    queue.push("Technology researched.", "success");

    const markup = renderToStaticMarkup(React.createElement(ToastStack, { queue }));
    expect(markup).toContain('aria-label="Notification toasts"');
    expect(markup).toContain("Technology researched.");
    expect(markup).toContain('aria-label="Dismiss Technology researched."');
    expect(markup).toContain('data-tone="success"');
  });
});
