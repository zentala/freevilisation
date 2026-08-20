import { describe, it, expect } from "vitest";
import { ENGINE_PACKAGE } from "./index";

describe("engine", () => {
  it("exports the engine package placeholder", () => {
    expect(ENGINE_PACKAGE).toBe("@freevilisation/engine");
  });
});
