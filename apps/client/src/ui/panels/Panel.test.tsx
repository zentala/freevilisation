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
      <Panel
        open={true}
        onOpenChange={vi.fn()}
        title="Test Panel"
        className="custom-class"
      >
        Content
      </Panel>,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveClass("custom-class");
  });

  it("uses aria-describedby when provided", () => {
    render(
      <Panel
        open={true}
        onOpenChange={vi.fn()}
        title="Test Panel"
        describedBy="description-id"
      >
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
});
