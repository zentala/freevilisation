import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./Tooltip";

describe("Tooltip (integration with Testing Library)", () => {
  it("renders children and tooltip with basic definition", () => {
    render(
      <Tooltip
        definition={{
          id: "unit.warrior",
          name: "Warrior",
          description: "A strong melee combatant.",
        }}
      >
        <button>Warrior</button>
      </Tooltip>,
    );
    expect(screen.getByText("Warrior")).toBeInTheDocument();
    expect(screen.getByRole("tooltip")).toHaveTextContent("Warrior");
    expect(screen.getByRole("tooltip")).toHaveTextContent("A strong melee combatant.");
  });

  it("displays yields when provided", () => {
    render(
      <Tooltip
        definition={{
          id: "improvement.farm",
          name: "Farm",
          yields: { Food: 2, Production: 1 },
        }}
      >
        <button>Farm</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Food: 2");
    expect(tooltip).toHaveTextContent("Production: 1");
  });

  it("displays requirements when provided", () => {
    render(
      <Tooltip
        definition={{
          id: "tech.bronze",
          name: "Bronze Working",
          requirements: ["Mining", "Animal Husbandry"],
        }}
      >
        <button>Bronze Working</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("Mining");
    expect(tooltip).toHaveTextContent("Animal Husbandry");
  });

  it("omits yields section when not provided", () => {
    render(
      <Tooltip
        definition={{
          id: "item.test",
          name: "Test Item",
        }}
      >
        <button>Test</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).not.toHaveTextContent("Yields");
  });

  it("omits requirements section when empty array provided", () => {
    render(
      <Tooltip
        definition={{
          id: "item.test",
          name: "Test Item",
          requirements: [],
        }}
      >
        <button>Test</button>
      </Tooltip>,
    );
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).not.toHaveTextContent("Requirements");
  });

  it("makes trigger accessible with keyboard", async () => {
    const user = userEvent.setup();
    render(
      <Tooltip
        definition={{
          id: "key-test",
          name: "Key Test",
          description: "Should be accessible by keyboard.",
        }}
      >
        <button>Trigger</button>
      </Tooltip>,
    );
    const trigger = screen.getByText("Trigger");
    const triggerWrapper = trigger.parentElement;
    expect(triggerWrapper).not.toBeNull();
    expect(triggerWrapper).toHaveAttribute("tabIndex", "0");
    triggerWrapper?.focus();
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveClass("group-focus-within:block");
  });
});
