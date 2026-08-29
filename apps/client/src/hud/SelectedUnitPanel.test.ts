import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SelectedUnitPanel } from "./SelectedUnitPanel";

describe("SelectedUnitPanel", () => {
  it("renders sentry, fortify, and skip order controls", () => {
    const html = renderToStaticMarkup(
      createElement(SelectedUnitPanel, {
        selectedUnitId: "unit-1",
        idleUnitCount: 1,
        onNextIdleUnit: vi.fn(),
        onSentry: vi.fn(),
        onFortify: vi.fn(),
        onSkip: vi.fn(),
      }),
    );
    expect(html).toContain("Sentry");
    expect(html).toContain("Fortify");
    expect(html).toContain("Skip");
  });
});
