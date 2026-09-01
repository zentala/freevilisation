import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import {
  getAvailableUnitActions,
  type UnitDefForActions,
  UnitActionsPanel,
} from "./UnitActionsPanel";

describe("getAvailableUnitActions", () => {
  it("preserves definition order while removing duplicate orders", () => {
    const def: UnitDefForActions = {
      id: "warrior",
      effects: ["melee"],
      availableOrders: ["move", "attack", "move", "fortify"],
    };

    expect(getAvailableUnitActions(def)).toEqual(["move", "attack", "fortify"]);
  });
});

describe("UnitActionsPanel", () => {
  it("renders action buttons with proper aria-labels for accessibility", () => {
    const selectedUnit = {
      id: "warrior-1",
      def: {
        id: "warrior",
        name: "Warrior",
        availableOrders: ["move", "attack", "fortify"] as const,
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(UnitActionsPanel, {
        selectedUnit,
        onOrder: () => undefined,
      }),
    );

    expect(html).toContain('aria-label="Move unit"');
    expect(html).toContain('aria-label="Attack unit"');
    expect(html).toContain('aria-label="Fortify unit"');
  });

  it("includes responsive classes for mobile-first design", () => {
    const selectedUnit = {
      id: "warrior-1",
      def: {
        id: "warrior",
        name: "Warrior",
        availableOrders: ["move", "attack"] as const,
      },
    };

    const html = renderToStaticMarkup(
      React.createElement(UnitActionsPanel, {
        selectedUnit,
        onOrder: () => undefined,
      }),
    );

    // Check for responsive padding classes
    expect(html).toContain("p-2");
    expect(html).toContain("sm:p-3");
    // Check for responsive gap classes
    expect(html).toContain("gap-1");
    expect(html).toContain("sm:gap-2");
  });
});
