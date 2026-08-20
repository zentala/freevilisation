import { describe, it, expect } from "vitest";
import { CONTENT_PACKAGE } from "./index";

describe("content", () => {
  it("exports the content package placeholder", () => {
    expect(CONTENT_PACKAGE).toBe("@freevilisation/content");
  });
});
