import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HudLayout } from "./HudLayout";

describe("HudLayout", () => {
  it("provides top, bottom, and right overlay regions", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudLayout, {
        topBar: React.createElement("span", null, "Turn"),
        bottomPanel: React.createElement("span", null, "Actions"),
        rightColumn: React.createElement("span", null, "Alerts"),
      }),
    );
    expect(markup).toContain('aria-label="Top bar"');
    expect(markup).toContain('aria-label="Bottom panel"');
    expect(markup).toContain('aria-label="Notifications"');
    expect(markup).toContain("Turn");
    expect(markup).toContain("Actions");
    expect(markup).toContain("Alerts");
  });

  it("keeps the regions empty when no HUD content is supplied", () => {
    const markup = renderToStaticMarkup(React.createElement(HudLayout));
    expect(markup.match(/aria-label=/g)).toHaveLength(3);
  });

  it("uses single-column layout on mobile with notifications as bottom sheet", () => {
    const markup = renderToStaticMarkup(React.createElement(HudLayout));
    expect(markup).toContain("grid-cols-1");
    expect(markup).toContain("grid-rows-[auto_minmax(0,1fr)_auto_auto]");
  });

  it("uses two-column layout on tablet and above with notifications on right", () => {
    const markup = renderToStaticMarkup(React.createElement(HudLayout));
    expect(markup).toContain("md:grid-cols-[minmax(0,1fr)_auto]");
    expect(markup).toContain("md:grid-rows-[auto_minmax(0,1fr)_auto]");
  });

  it("positions notifications column at row-start-4 on mobile (bottom sheet)", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudLayout, {
        rightColumn: React.createElement("span", null, "Alerts"),
      }),
    );
    const notificationsSection = markup.match(
      /<section[^>]*aria-label="Notifications"[^>]*class="[^"]*row-start-4[^"]*"/,
    );
    expect(notificationsSection).toBeTruthy();
  });

  it("positions notifications column on right at row-start-2 on tablet and above", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudLayout, {
        rightColumn: React.createElement("span", null, "Alerts"),
      }),
    );
    expect(markup).toContain("md:col-start-2");
    expect(markup).toContain("md:row-start-2");
    expect(markup).toContain("md:row-span-2");
  });

  it("supports responsive grid layout for various viewport sizes", () => {
    const markup = renderToStaticMarkup(
      React.createElement(HudLayout, {
        topBar: React.createElement("span", null, "Turn"),
        bottomPanel: React.createElement("span", null, "Actions"),
        rightColumn: React.createElement("span", null, "Alerts"),
      }),
    );
    // Verify the grid-cols class for column layout
    expect(markup).toContain("grid-cols-[minmax(0,1fr)_auto]");
    // Verify the grid-rows class for row layout
    expect(markup).toContain("grid-rows-[auto_minmax(0,1fr)_auto]");
  });
});
