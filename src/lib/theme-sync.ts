import type { ThemeMode, AccentColor, UIVersion } from "./finance";

export interface ThemePrefPayload {
  theme: ThemeMode;
  uiVersion: UIVersion;
  accentColor: AccentColor;
  highContrast?: boolean;
}

const STORAGE_KEY = "fp-theme-pref";

/**
 * Lee síncronamente la preferencia de tema desde localStorage sin depender
 * de la inicialización asíncrona de WebCrypto / IndexedDB.
 */
export function readInitialThemePref(): ThemePrefPayload {
  if (typeof window === "undefined") {
    return { theme: "system", uiVersion: "v2", accentColor: "emerald" };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        theme:
          parsed.theme === "dark" || parsed.theme === "light" || parsed.theme === "system"
            ? parsed.theme
            : "system",
        uiVersion: parsed.uiVersion === "classic" ? "classic" : "v2",
        accentColor: parsed.accentColor || "emerald",
        highContrast: Boolean(parsed.highContrast),
      };
    }
  } catch {
    /* ignore parse errors */
  }
  return { theme: "system", uiVersion: "v2", accentColor: "emerald" };
}

/**
 * Escribe la preferencia de tema en localStorage y sincroniza documentElement de inmediato.
 */
export function writeThemePref(patch: Partial<ThemePrefPayload>) {
  if (typeof window === "undefined") return;
  try {
    const current = readInitialThemePref();
    const next: ThemePrefPayload = { ...current, ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    const isDark =
      next.theme === "dark" ||
      (next.theme === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    const root = document.documentElement;
    root.classList.toggle("dark", isDark);
    root.classList.toggle("ui-v2", next.uiVersion === "v2");
    root.classList.toggle("ui-classic", next.uiVersion === "classic");
    root.style.backgroundColor = isDark ? "#0C0C0B" : "#FAF8F5";

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", isDark ? "#0C0C0B" : "#FAF8F5");
    }
  } catch {
    /* ignore storage errors */
  }
}
