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

  it("includes aria-labels for all interactive controls", () => {
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
    expect(html).toContain('aria-label="Select next idle unit"');
    expect(html).toContain('aria-label="Sentry unit"');
    expect(html).toContain('aria-label="Fortify unit"');
    expect(html).toContain('aria-label="Skip unit"');
  });

  it("includes responsive classes for mobile-first design", () => {
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
    // Check for responsive positioning
    expect(html).toContain("bottom-2");
    expect(html).toContain("sm:bottom-6");
    expect(html).toContain("left-2");
    expect(html).toContain("sm:left-6");
    // Check for responsive padding
    expect(html).toContain("p-2");
    expect(html).toContain("sm:p-4");
  });
});
