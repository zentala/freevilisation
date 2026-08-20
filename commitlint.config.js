export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "docs", "style", "refactor", "test", "chore", "perf"],
    ],
    "subject-max-length": [2, "always", 50],
    "subject-full-stop": [2, "never", "."],
  },
};
