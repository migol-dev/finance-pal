import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { BrandLogo } from "@/components/app/BrandLogo";
import { SplashScreen } from "@/components/app/SplashScreen";
import { DesignCompareToggle } from "@/components/app/DesignCompareToggle";
import { useFinance } from "@/store/finance-store";

describe("Sprint 1 UI Version Components", () => {
  beforeEach(() => {
    useFinance.getState().resetAll();
  });

  describe("BrandLogo", () => {
    it("renders vector SVG in v2 mode", () => {
      useFinance.getState().setUIVersion("v2");
      const { container } = render(<BrandLogo withText subtitle="Mi resumen" />);
      expect(container.querySelector("svg")).toBeTruthy();
      expect(container.querySelector("img")).toBeNull();
      expect(screen.getByText("Finance Pal")).toBeTruthy();
      expect(screen.getByText("Mi resumen")).toBeTruthy();
    });

    it("renders webp image in classic mode", () => {
      useFinance.getState().setUIVersion("classic");
      const { container } = render(<BrandLogo withText subtitle="Clásico" />);
      const img = container.querySelector("img");
      expect(img).toBeTruthy();
      expect(img?.getAttribute("alt")).toBe("Finance Pal");
      expect(container.querySelector("svg")).toBeNull();
    });

    it("respects forceVersion prop override", () => {
      useFinance.getState().setUIVersion("v2");
      const { container } = render(<BrandLogo forceVersion="classic" />);
      expect(container.querySelector("img")).toBeTruthy();
      expect(container.querySelector("svg")).toBeNull();
    });
  });

  describe("SplashScreen", () => {
    it("renders animated monogram and subtitle in v2 mode", () => {
      useFinance.getState().setUIVersion("v2");
      render(<SplashScreen />);
      expect(screen.getByText("Finance Pal")).toBeTruthy();
      expect(screen.getByText("Tu compañero financiero")).toBeTruthy();
    });

    it("renders classic wallet layout in classic mode", () => {
      useFinance.getState().setUIVersion("classic");
      render(<SplashScreen />);
      expect(screen.getByText("Finance Pal")).toBeTruthy();
      expect(screen.queryByText("Tu compañero financiero")).toBeNull();
    });
  });

  describe("DesignCompareToggle", () => {
    it("toggles between v2 and classic when button is clicked", () => {
      useFinance.getState().setUIVersion("v2");
      render(<DesignCompareToggle />);
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");

      const toggleBtn = screen.getByTitle(/Alternar diseño de la interfaz/i);
      fireEvent.click(toggleBtn);
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");

      fireEvent.click(toggleBtn);
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");
    });

    it("ignores Alt+D shortcut when typing inside an input element", () => {
      useFinance.getState().setUIVersion("v2");
      render(
        <div>
          <input data-testid="test-input" type="text" />
          <DesignCompareToggle />
        </div>
      );

      const input = screen.getByTestId("test-input");
      fireEvent.keyDown(input, { key: "d", altKey: true });
      expect(useFinance.getState().appSettings.uiVersion).toBe("v2");
    });

    it("triggers toggle on Alt+D shortcut when outside input elements", () => {
      useFinance.getState().setUIVersion("v2");
      render(<DesignCompareToggle />);

      fireEvent.keyDown(window, { key: "d", altKey: true });
      expect(useFinance.getState().appSettings.uiVersion).toBe("classic");
    });
  });
});
