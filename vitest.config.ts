import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "apps/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["packages/*/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/*.config.ts", "packages/*/src/index.ts"],
      thresholds: {
        "packages/ai/src/**": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "packages/content/src/**": { statements: 100, branches: 100, functions: 100, lines: 100 },
        "packages/protocol/src/**": { statements: 100, branches: 100, functions: 100, lines: 100 },
        // ai/content/protocol are still one-line placeholders, so 100% is free.
        // mapgen gets real code in E04; hold it to the same floor as engine
        // rather than a 100% bar that new generation code cannot clear.
        "packages/mapgen/src/**": { statements: 85, branches: 75, functions: 78, lines: 88 },
        "packages/engine/src/**": { statements: 85, branches: 75, functions: 78, lines: 88 },
      },
    },
  },
});
