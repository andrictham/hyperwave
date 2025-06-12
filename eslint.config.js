import convexPlugin from "@convex-dev/eslint-plugin";
import eslint from "@eslint/js";
import pluginRouter from "@tanstack/eslint-plugin-router";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  pluginRouter.configs["flat/recommended"],
  convexPlugin.configs.recommended,
  {
    files: ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"],
    rules: {
      "no-unused-vars": "warn",
      "no-undef": "warn",
    },
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/*.d.ts",
      "**/convex/_generated/**",
    ],
  },
);
