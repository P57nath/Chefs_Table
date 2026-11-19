import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import comments from "@eslint-community/eslint-plugin-eslint-comments/configs";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  comments.recommended,
  {
    rules: {
      // CLAUDE.md rule 10: no `any`, no ts-ignore, no eslint-disable without a reason.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        { "ts-expect-error": "allow-with-description", "ts-ignore": true, "ts-nocheck": true },
      ],
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      // Zod must be imported from @/lib/zod (jitless config for the strict CSP).
      "no-restricted-imports": [
        "error",
        { paths: [{ name: "zod", message: "Import { z } from '@/lib/zod' instead." }] },
      ],
    },
  },
  {
    files: ["src/lib/zod.ts", "tests/**", "scripts/**"],
    rules: { "no-restricted-imports": "off" },
  },
  {
    // Node scripts run outside the app and log progress.
    files: ["scripts/**"],
    rules: { "no-console": "off" },
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "src/types/database.ts",
    "supabase/.temp/**",
    // Kit reference material (tested SQL + smoke test) is kept verbatim.
    "docs/**",
  ]),
]);

export default eslintConfig;
