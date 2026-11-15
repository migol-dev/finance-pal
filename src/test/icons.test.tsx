import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  APP_ICON_IDS,
  EMOJI_TO_ICON,
  ICON_GROUPS,
  isAppIconId,
  resolveIconId,
} from "@/lib/icon-ids";
import { APP_ICONS } from "@/components/icons/registry";
import { AppIcon } from "@/components/icons/AppIcon";
import { IconDisplay } from "@/components/app/IconDisplay";
import {
  COMMON_EMOJIS,
  DEFAULT_CATEGORY_EMOJI,
  DEFAULT_CATEGORY_ICON,
  LEGACY_CATEGORY_EMOJI,
  LEGACY_CATEGORY_ICON,
  PAYMENT_METHOD_EMOJI,
  PAYMENT_METHOD_ICON,
  getCategoriesIconMap,
  iconFor,
  iconIdFor,
} from "@/lib/finance";

describe("SVG Icon System & Legacy Emoji Compatibility", () => {
  it("cubre el 100% de COMMON_EMOJIS, categorias y metodos de pago en EMOJI_TO_ICON y APP_ICONS", () => {
    const allLegacy = new Set<string>([
      ...COMMON_EMOJIS,
      ...Object.values(DEFAULT_CATEGORY_EMOJI),
      ...Object.values(LEGACY_CATEGORY_EMOJI),
      ...Object.values(PAYMENT_METHOD_EMOJI),
    ]);

    for (const emoji of allLegacy) {
      const mapped = EMOJI_TO_ICON[emoji];
      expect(mapped, `Falta mapeo para emoji ${emoji}`).toBeDefined();
      expect(isAppIconId(mapped), `ID invalido para ${emoji}: ${mapped}`).toBe(true);
      expect(APP_ICONS[mapped], `Componente faltante para ${mapped}`).toBeDefined();
    }
  });

  it("todos los APP_ICON_IDS estan registrados en APP_ICONS y se renderizan en SVG", () => {
    for (const id of APP_ICON_IDS) {
      expect(APP_ICONS[id]).toBeDefined();
      const { container } = render(<AppIcon name={id} />);
      const svg = container.querySelector("svg");
      expect(svg).not.toBeNull();
    }
    expect(ICON_GROUPS.length).toBeGreaterThanOrEqual(5);
  });

  it("resolveIconId traduce IDs validos, emojis legados y aplica fallback", () => {
    expect(resolveIconId("wallet")).toBe("wallet");
    expect(resolveIconId("🛒")).toBe("cart");
    expect(resolveIconId("👨‍👩‍👧")).toBe("users");
    expect(resolveIconId("no-existe-jamás", "sparkles")).toBe("sparkles");
  });

  it("DEFAULT_CATEGORY_ICON, LEGACY_CATEGORY_ICON y PAYMENT_METHOD_ICON tienen llaves consistentes", () => {
    expect(Object.keys(DEFAULT_CATEGORY_ICON)).toEqual(Object.keys(DEFAULT_CATEGORY_EMOJI));
    expect(Object.keys(LEGACY_CATEGORY_ICON)).toEqual(Object.keys(LEGACY_CATEGORY_EMOJI));
    expect(Object.keys(PAYMENT_METHOD_ICON)).toEqual(Object.keys(PAYMENT_METHOD_EMOJI));
  });

  it("iconIdFor y getCategoriesIconMap resuelven categorias por defecto, legadas y personalizadas", () => {
    const custom = [
      { id: "c1", name: "Gimnasio Pro", emoji: "💪", icon: "dumbbell" as const },
      { id: "c2", name: "Suscripciones", emoji: "📺" },
    ];
    const map = getCategoriesIconMap(custom);
    expect(map["Alimentación"]).toBe("cart");
    expect(map["Gimnasio Pro"]).toBe("dumbbell");
    expect(map["Suscripciones"]).toBe("tv");

    expect(iconIdFor("Alimentación", custom)).toBe("cart");
    expect(iconIdFor("Café", custom)).toBe("coffee");
    expect(iconIdFor("gimnasio pro", custom)).toBe("dumbbell");
    expect(iconIdFor("Desconocida", custom)).toBe("cash");
  });

  it("iconFor normaliza iconos legados emoji a kind 'icon' y conserva kind 'image'", () => {
    expect(iconFor({ icon: { kind: "image", value: "data:image/png;base64,AAA" } })).toEqual({
      kind: "image",
      value: "data:image/png;base64,AAA",
    });
    expect(iconFor({ icon: { kind: "emoji", value: "🛒" } })).toEqual({
      kind: "icon",
      value: "cart",
    });
    expect(iconFor({ emoji: "🚗" })).toEqual({
      kind: "icon",
      value: "car",
    });
    expect(iconFor({ category: "Vivienda" })).toEqual({
      kind: "icon",
      value: "home",
    });
  });

  it("IconDisplay renderiza SVG sin texto emoji y mantiene clases sizeMap", () => {
    const { container: emojiContainer } = render(
      <IconDisplay size="xs" icon={{ kind: "emoji", value: "🛒" }} />
    );
    expect(emojiContainer.querySelector("svg")).not.toBeNull();
    expect(emojiContainer.textContent).toBe("");
    const wrapper = emojiContainer.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("size-6");
    expect(wrapper.className).toContain("text-xs");

    const { container: svgContainer } = render(
      <IconDisplay size="md" icon={{ kind: "icon", value: "wallet" }} />
    );
    expect(svgContainer.querySelector("svg")).not.toBeNull();
    expect(svgContainer.textContent).toBe("");
  });
});
