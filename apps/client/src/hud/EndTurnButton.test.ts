import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { EndTurnButton } from "./EndTurnButton";

describe("EndTurnButton", () => {
  it("renders a bottom-right control with the idle-unit badge", () => {
    const element = EndTurnButton({ idleUnitCount: 3, onEndTurn: vi.fn() });
    const button = element.props.children.props;
    const markup = renderToStaticMarkup(
      React.createElement(EndTurnButton, { idleUnitCount: 3, onEndTurn: vi.fn() }),
    );
    expect(element.props.className).toContain("bottom-2");
    expect(element.props.className).toContain("sm:bottom-6");
    expect(button["aria-label"]).toBe("End turn");
    expect(markup).toContain('aria-label="3 idle units"');
    expect(markup).toContain(">3</span>");
  });

  it("disables the control when it is not the player's turn", () => {
    const element = EndTurnButton({ idleUnitCount: 0, onEndTurn: vi.fn(), isPlayerTurn: false });
    expect(element.props.children.props.disabled).toBe(true);
  });

  it("does not render an empty badge", () => {
    const markup = renderToStaticMarkup(
      React.createElement(EndTurnButton, { idleUnitCount: 0, onEndTurn: vi.fn() }),
    );
    expect(markup).not.toContain("idle units");
  });

  it("includes responsive button text and padding", () => {
    const element = EndTurnButton({ idleUnitCount: 0, onEndTurn: vi.fn() });
    const button = element.props.children.props;
    // Check for responsive padding classes
    expect(button.className).toContain("px-3");
    expect(button.className).toContain("sm:px-5");
    expect(button.className).toContain("py-2");
    expect(button.className).toContain("sm:py-3");
  });

  it("focuses the first idle unit and warns before ending", () => {
    const onEndTurn = vi.fn();
    const onFocusIdleUnit = vi.fn();
    const onNotify = vi.fn();
    const element = EndTurnButton({
      idleUnitCount: 2,
      idleUnitIds: ["unit-2", "unit-7"],
      onEndTurn,
      onFocusIdleUnit,
      onNotify,
    });

    element.props.children.props.onClick();
    expect(onFocusIdleUnit).toHaveBeenCalledWith("unit-2");
    expect(onNotify).toHaveBeenCalledWith("Unit needs orders");
    expect(onEndTurn).not.toHaveBeenCalled();
  });

  it("ends immediately when idle-unit confirmation is disabled", () => {
    const onEndTurn = vi.fn();
    const element = EndTurnButton({
      idleUnitCount: 1,
      idleUnitIds: ["unit-2"],
      onEndTurn,
      confirmEndTurnWithIdleUnits: false,
    });

    element.props.children.props.onClick();
    expect(onEndTurn).toHaveBeenCalledOnce();
  });
});
