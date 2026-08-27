import { describe, expect, it } from "vitest";
import { TurnIndicator } from "./TurnIndicator";

describe("TurnIndicator", () => {
  it("renders the current turn and era in the top bar", () => {
    const element = TurnIndicator({ turn: 12, era: "Classical" });
    expect(element.props["aria-label"]).toBe("Turn 12, Classical era");
    expect(element.props.className).toContain("top-6");
    expect(element.props.children[0].props.children).toEqual(["Turn ", 12]);
    expect(element.props.children[2].props.children).toBe("Classical");
  });

  it("supports the initial era", () => {
    const element = TurnIndicator({ turn: 1, era: "Ancient" });
    expect(element.props["aria-label"]).toBe("Turn 1, Ancient era");
  });
});
