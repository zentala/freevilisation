import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@freevilisation/content",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
