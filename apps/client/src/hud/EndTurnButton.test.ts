import { describe, expect, it, vi } from "vitest";
import { EndTurnButton } from "./EndTurnButton";

describe("EndTurnButton", () => {
  it("renders a bottom-right control with the idle-unit badge", () => {
    const element = EndTurnButton({ idleUnitCount: 3, onEndTurn: vi.fn() });
    const button = element.props.children.props;
    const badge = button.children[1];
    expect(element.props.className).toContain("bottom-6");
    expect(button["aria-label"]).toBe("End turn");
    expect(badge.props["aria-label"]).toBe("3 idle units");
    expect(badge.props.children).toBe(3);
  });

  it("disables the control when it is not the player's turn", () => {
    const element = EndTurnButton({ idleUnitCount: 0, onEndTurn: vi.fn(), isPlayerTurn: false });
    expect(element.props.children.props.disabled).toBe(true);
  });

  it("does not render an empty badge", () => {
    const element = EndTurnButton({ idleUnitCount: 0, onEndTurn: vi.fn() });
    expect(element.props.children.props.children[1]).toBe(false);
  });
});
