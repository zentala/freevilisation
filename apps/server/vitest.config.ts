import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@freevilisation/server",
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
