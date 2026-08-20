import tseslint from "typescript-eslint";

/**
 * Module boundaries.
 *
 * Allowed dependency directions (ARCHITECTURE.md):
 *   engine  -> nothing
 *   content -> engine
 *   protocol-> engine, content
 *   mapgen  -> engine, content
 *   ai      -> engine, content, protocol
 *   client  -> all five
 *   server  -> engine, content, protocol, ai
 *
 * Enforced on the literal import string rather than a resolved file path:
 * workspace packages are imported by package name, and a package that is not
 * a declared dependency does not resolve at all — a path-resolving rule
 * silently passes on exactly the imports it is meant to catch.
 */
const WORKSPACE = ["engine", "content", "protocol", "mapgen", "ai"];

function forbid(dir, allowed) {
  const banned = WORKSPACE.filter((p) => !allowed.includes(p));
  const patterns = [
    {
      group: ["../**/src/**"],
      message:
        "Relative imports must not reach into another package. Import the sibling by its workspace name.",
    },
  ];
  if (banned.length > 0) {
    patterns.unshift({
      group: banned.flatMap((p) => [`@freevilisation/${p}`, `@freevilisation/${p}/*`]),
      message: `${dir} must not depend on that package — see ARCHITECTURE.md.`,
    });
  }
  return {
    files: [`${dir}/**/*.ts`, `${dir}/**/*.tsx`],
    rules: { "no-restricted-imports": ["error", { patterns }] },
  };
}

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/dist-types/**",
      "**/node_modules/**",
      "**/.claude/**",
      ".plan/**",
      "**/coverage/**",
    ],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  forbid("packages/engine", []),
  forbid("packages/content", ["engine"]),
  forbid("packages/protocol", ["engine", "content"]),
  forbid("packages/mapgen", ["engine", "content"]),
  forbid("packages/ai", ["engine", "content", "protocol"]),
  forbid("apps/client", WORKSPACE),
  forbid("apps/server", ["engine", "content", "protocol", "ai"]),
  {
    files: ["packages/engine/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "Date", message: "Use seeded RNG / turn counters, not Date." },
        { name: "window", message: "packages/engine must be DOM-free." },
        { name: "document", message: "packages/engine must be DOM-free." },
        { name: "fetch", message: "packages/engine must be network-free." },
        { name: "WebSocket", message: "packages/engine must be network-free." },
        {
          name: "requestAnimationFrame",
          message: "packages/engine must be DOM-free.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "Use the seeded Prng, not Math.random.",
        },
        {
          object: "Date",
          property: "now",
          message: "packages/engine must be deterministic — no clock reads.",
        },
      ],
    },
  },
);
