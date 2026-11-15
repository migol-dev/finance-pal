import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "https://mock.supabase.co",
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || "mock-anon-key",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      }
    }
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
