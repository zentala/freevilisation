import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "@freevilisation/client",
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
  },
});
