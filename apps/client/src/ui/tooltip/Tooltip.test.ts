import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip", () => {
  it("renders definition description, yields, and requirements", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Tooltip, {
        definition: {
          id: "unit.warrior",
          name: "Warrior",
          description: "A reliable melee unit.",
          yields: { Strength: 20, Cost: 40 },
          requirements: ["Bronze Working", "Barracks"],
        },
        children: "Warrior button",
      }),
    );
    expect(markup).toContain('role="tooltip"');
    expect(markup).toContain("A reliable melee unit.");
    expect(markup).toContain("Strength: 20");
    expect(markup).toContain("Bronze Working");
  });

  it("keeps optional sections absent when no data is supplied", () => {
    const markup = renderToStaticMarkup(
      React.createElement(Tooltip, {
        definition: { id: "tech.none", name: "Unknown" },
        children: "Unknown button",
      }),
    );
    expect(markup).not.toContain("Yields");
    expect(markup).not.toContain("Requirements");
  });
});
