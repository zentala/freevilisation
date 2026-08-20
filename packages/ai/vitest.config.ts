import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@freevilisation/ai",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
