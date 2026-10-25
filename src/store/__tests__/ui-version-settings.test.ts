import { describe, it, expect, beforeEach } from "vitest";
import { useFinance } from "@/store/finance-store";
import { getAccentPalette, ACCENT_PALETTES, ACCENT_PALETTES_V2 } from "@/lib/accent-palette";

describe("UIVersion dual design settings & palette engine", () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
  });

  describe("1. Store defaults and actions", () => {
    it("initializes with uiVersion 'v2' by default", () => {
      const state = useFinance.getState();
      expect(state.appSettings.uiVersion).toBe("v2");
      expect(state.appSettings.accentColor).toBe("emerald");
    });

    it("updates uiVersion to 'classic' when setUIVersion is called", () => {
      useFinance.getState().setUIVersion("classic");
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");
    });

    it("updates uiVersion to 'v2' when setUIVersion('v2') is called", () => {
      useFinance.getState().setUIVersion("classic");
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");
      useFinance.getState().setUIVersion("v2");
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");
    });

    it("toggles uiVersion between 'v2' and 'classic' with toggleUIVersion", () => {
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");

      useFinance.getState().toggleUIVersion();
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");

      useFinance.getState().toggleUIVersion();
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");
    });

    it("safely handles toggle when uiVersion is initially undefined", () => {
      useFinance.setState((s) => ({
        appSettings: { ...s.appSettings, uiVersion: undefined },
      }));

      useFinance.getState().toggleUIVersion();
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");
    });
  });

  describe("2. getAccentPalette engine", () => {
    it("returns Warm Editorial v2 emerald palette by default", () => {
      const palette = getAccentPalette("light", "emerald", "v2");
      expect(palette).toEqual(ACCENT_PALETTES_V2.light.emerald);
      expect(palette.primary).toBe("159 59% 30%");
      expect(palette.hue).toBe(159);
    });

    it("returns classic emerald palette when uiVersion is classic", () => {
      const palette = getAccentPalette("light", "emerald", "classic");
      expect(palette).toEqual(ACCENT_PALETTES.light.emerald);
      expect(palette.primary).toBe("160 80% 42%");
      expect(palette.hue).toBe(160);
    });

    it("returns Warm Editorial v2 dark palettes correctly", () => {
      const darkEmerald = getAccentPalette("dark", "emerald", "v2");
      expect(darkEmerald.primary).toBe("158 64% 52%");

      const darkAmber = getAccentPalette("dark", "amber", "v2");
      expect(darkAmber.primary).toBe("38 92% 50%");

      const darkBlue = getAccentPalette("dark", "blue", "v2");
      expect(darkBlue.primary).toBe("213 94% 68%");

      const darkRose = getAccentPalette("dark", "rose", "v2");
      expect(darkRose.primary).toBe("351 95% 71%");

      const darkViolet = getAccentPalette("dark", "violet", "v2");
      expect(darkViolet.primary).toBe("255 92% 76%");
    });

    it("falls back safely to emerald if an unknown color is passed", () => {
      const fallback = getAccentPalette("light", "nonexistent" as unknown as AccentColor, "v2");
      expect(fallback).toEqual(ACCENT_PALETTES_V2.light.emerald);
    });

    it("defensively handles 'system' or undefined theme without throwing", () => {
      const systemPalette = getAccentPalette("system" as any, "emerald", "v2");
      expect(systemPalette).toEqual(ACCENT_PALETTES_V2.light.emerald);

      const undefinedPalette = getAccentPalette(undefined as any, "emerald", "v2");
      expect(undefinedPalette).toEqual(ACCENT_PALETTES_V2.light.emerald);
    });
  });

  describe("3. useFinanceData facade exposure", () => {
    it("exposes uiVersion, setUIVersion, and toggleUIVersion on the facade", () => {
      const store = useFinance.getState();
      expect(store.appSettings.uiVersion).toBe("v2");

      store.setUIVersion("classic");
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");

      store.toggleUIVersion();
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");
    });
  });
});
