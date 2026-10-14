import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Unused args prefixed with "_" are intentional (adapters, callbacks).
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // The database, auth and secrets live behind src/server. Client
    // components must never reach into it; `server-only` enforces this at
    // build time, this rule surfaces it while editing. Types are erased at
    // build time, so `import type` of server shapes is allowed.
    files: ["src/components/**/*.{ts,tsx}", "src/lib/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/server/*"], message: "UI and shared code cannot import server modules.", allowTypeImports: true },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "drizzle/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".mail-outbox/**",
  ]),
]);

export default eslintConfig;
