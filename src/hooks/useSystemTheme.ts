import { useEffect, useState } from "react";
import { useFinance } from "@/store/finance-store";
import type { ThemeMode } from "@/lib/finance";

/**
 * Resolves the effective theme ("light" | "dark") based on the user's
 * stored preference and the OS / browser `prefers-color-scheme` media query.
 *
 * Priority:
 *  1. If the user has explicitly chosen "light" or "dark" → use that.
 *  2. If the preference is "system" → follow the OS media query in real-time.
 */
export function useSystemTheme() {
  const storeTheme: ThemeMode = useFinance((s) => s.theme);

  const getSystemPreference = (): "light" | "dark" => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const [systemPreference, setSystemPreference] = useState<"light" | "dark">(
    getSystemPreference
  );

  // Listen for real-time OS theme changes
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setSystemPreference(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Resolved theme: manual override wins, otherwise system
  const resolvedTheme: "light" | "dark" =
    storeTheme === "system" ? systemPreference : storeTheme;

  return {
    /** The raw value stored by the user: "light" | "dark" | "system" */
    themePreference: storeTheme,
    /** The OS / browser preference right now */
    systemPreference,
    /** The theme that should actually be applied */
    resolvedTheme,
    /** Whether the user is on automatic/system mode */
    isSystemMode: storeTheme === "system",
  };
}
