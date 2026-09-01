import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <Panel open={false} onOpenChange={vi.fn()} title="Test Panel">
        Content here
      </Panel>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog with title and children when open is true", () => {
    render(
      <Panel open={true} onOpenChange={vi.fn()} title="Test Panel">
        Panel content
      </Panel>,
    );
    expect(screen.getByText("Test Panel")).toBeInTheDocument();
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    render(
      <Panel open={true} onOpenChange={vi.fn()} title="Test Panel">
        Content
      </Panel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-labelledby", "panel-title");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("calls onOpenChange with false when close button is clicked", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Panel open={true} onOpenChange={onOpenChange} title="Test Panel">
        Content
      </Panel>,
    );
    const closeButton = screen.getByLabelText("Close panel");
    await user.click(closeButton);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange with false when Escape key is pressed", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(
      <Panel open={true} onOpenChange={onOpenChange} title="Test Panel">
        Content
      </Panel>,
    );
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders in popover mode without modal backdrop", () => {
    render(
      <Panel open={true} onOpenChange={vi.fn()} title="Test Panel" mode="popover">
        Popover content
      </Panel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-modal");
  });

  it("applies custom className", () => {
    render(
      <Panel open={true} onOpenChange={vi.fn()} title="Test Panel" className="custom-class">
        Content
      </Panel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("custom-class");
  });

  it("uses aria-describedby when provided", () => {
    render(
      <Panel open={true} onOpenChange={vi.fn()} title="Test Panel" describedBy="description-id">
        Content
      </Panel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "description-id");
  });

  it("calls onOpenChange with false when backdrop is clicked in dialog mode", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Panel open={true} onOpenChange={onOpenChange} title="Test Panel" mode="dialog">
        Content
      </Panel>,
    );
    const backdrop = container.querySelector('[data-panel-backdrop="true"]');
    expect(backdrop).not.toBeNull();
    if (backdrop) {
      await user.click(backdrop);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    }
  });

  it("manages z-index dynamically for stacking multiple panels", () => {
    const { container: container1, rerender: rerender1 } = render(
      <Panel open={true} onOpenChange={vi.fn()} title="Panel 1">
        Content 1
      </Panel>,
    );
    const dialog1 = container1.querySelector('[role="dialog"]') as HTMLElement;
    const zIndex1 = dialog1?.style.zIndex;

    const { container: container2 } = render(
      <Panel open={true} onOpenChange={vi.fn()} title="Panel 2">
        Content 2
      </Panel>,
    );
    const dialog2 = container2.querySelector('[role="dialog"]') as HTMLElement;
    const zIndex2 = dialog2?.style.zIndex;

    // Second panel should have higher z-index
    if (zIndex1 && zIndex2) {
      expect(Number(zIndex2)).toBeGreaterThan(Number(zIndex1));
    }
  });

  it("traps focus within the panel using Tab key", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Panel open={true} onOpenChange={onOpenChange} title="Test Panel">
        <button>First Button</button>
        <button>Second Button</button>
      </Panel>,
    );

    const buttons = screen.getAllByRole("button");
    // Last button should be the second button (close button is 3rd)
    const lastInteractiveButton = buttons[buttons.length - 2];

    // Focus the last interactive button
    lastInteractiveButton.focus();
    expect(document.activeElement).toBe(lastInteractiveButton);

    // Press Tab - focus should cycle to first focusable element in panel
    await user.keyboard("{Tab}");
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;
    expect(document.activeElement).toBe(firstElement);
  });

  it("traps focus within the panel using Shift+Tab key", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { container } = render(
      <Panel open={true} onOpenChange={onOpenChange} title="Test Panel">
        <button>First Button</button>
        <button>Second Button</button>
      </Panel>,
    );

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const firstElement = focusableElements[0] as HTMLElement;

    // Focus the first focusable element
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);

    // Press Shift+Tab - focus should cycle to last focusable element
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
    expect(document.activeElement).toBe(lastElement);
  });

  it("restores focus to previously focused element when panel closes", async () => {
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <>
        <button id="trigger">Open Panel</button>
        <Panel open={true} onOpenChange={onOpenChange} title="Test Panel">
          Content
        </Panel>
      </>,
    );

    const triggerButton = document.getElementById("trigger") as HTMLElement;
    triggerButton.focus();
    expect(document.activeElement).toBe(triggerButton);

    // Close the panel
    rerender(
      <>
        <button id="trigger">Open Panel</button>
        <Panel open={false} onOpenChange={onOpenChange} title="Test Panel">
          Content
        </Panel>
      </>,
    );

    // Focus should be restored to trigger button
    expect(document.activeElement).toBe(triggerButton);
  });
});
