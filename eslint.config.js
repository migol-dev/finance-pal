import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "android/**", "supabase/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    files: [
      "src/pages/*Classic.tsx",
      "src/test/**/*.{ts,tsx}",
      "src/**/__tests__/**/*.{ts,tsx}",
      "src/components/ui/**/*.{ts,tsx}",
      "src/components/app/DataConflictDialog.tsx",
      "src/hooks/useSessionManager.ts",
      "src/lib/encrypted-storage.ts",
      "src/lib/framer.tsx",
      "src/lib/rate-limiter.ts",
      "src/lib/schema-migrations.ts",
      "src/lib/sync-engine.ts",
      "src/pages/ajustes/secciones/**/*.{ts,tsx}",
      "src/pages/metas/GoalDetailContent.tsx",
      "src/services/**/*.{ts,tsx}",
      "src/store/finance-store.ts",
      "src/store/sync-store.ts",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
