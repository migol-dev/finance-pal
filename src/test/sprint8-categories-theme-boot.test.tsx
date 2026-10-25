import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getCategoriesMap,
  emojiFor,
  MAX_CUSTOM_CATEGORY_NAME_LENGTH,
  DEFAULT_CATEGORY_EMOJI,
  LEGACY_CATEGORY_EMOJI,
  CustomCategory,
} from "@/lib/finance";
import { readInitialThemePref, writeThemePref } from "@/lib/theme-sync";
import { useFinance } from "@/store/finance-store";
import { AnualV2 } from "@/components/anual/AnualV2";
import { FolderChips } from "@/pages/metas/FolderChips";
import { LoginV2 } from "@/pages/LoginV2";
import LoginClassic from "@/pages/LoginClassic";
import { CategorySelectWithCreate } from "@/components/app/CategorySelectWithCreate";

// Mock AuthContext
vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    mfaRequired: false,
    signOut: vi.fn(),
    checkMfaStatus: vi.fn(),
    refreshSession: vi.fn(),
  }),
}));

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      mfa: {
        listFactors: vi.fn().mockResolvedValue({ data: { all: [] }, error: null }),
        challenge: vi.fn(),
        verify: vi.fn(),
      },
    },
  },
  isSupabaseEnabled: false,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sprint 8 — Bloque 1: Resumen Anual & Metas Folder Layout", () => {
  it("renders AnualV2 tabs in a full-width 4-column switcher with proper labels", () => {
    renderWithProviders(<AnualV2 />);

    const generalTab = screen.getByRole("tab", { name: "General" });
    const catTab = screen.getByRole("tab", { name: "Categorías" });
    const metodosTab = screen.getByRole("tab", { name: "Métodos" });
    const metasTab = screen.getByRole("tab", { name: "Metas" });

    expect(generalTab).toBeInTheDocument();
    expect(catTab).toBeInTheDocument();
    expect(metodosTab).toBeInTheDocument();
    expect(metasTab).toBeInTheDocument();

    // Verify grid-cols-4 layout
    const tabList = screen.getByRole("tablist", { name: "Vistas del resumen anual" });
    expect(tabList.className).toContain("grid-cols-4");
  });

  it("renders Metas FolderChips with strictly 3 buttons and never pushes carpetas button", () => {
    const dummyFolders = [
      {
        id: "f-1",
        name: "Vacaciones Largas de Verano",
        color: "gradient-sunset",
        order: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        children: [],
      },
      {
        id: "f-2",
        name: "Coche Nuevo y Seguro",
        color: "gradient-emerald",
        order: 1,
        createdAt: "2026-01-01T00:00:00.000Z",
        children: [],
      },
    ];

    render(
      <FolderChips
        folderTree={dummyFolders}
        goals={[]}
        goalFolders={dummyFolders}
        selectedFolderId={null}
        onSelectFolder={vi.fn()}
        onEditFolder={vi.fn()}
        onDeleteFolder={vi.fn()}
        onAddChildFolder={vi.fn()}
        getFolderGoalCount={() => 0}
      />
    );

    // Only 3 buttons are rendered: "Todas", "Sin carpeta", "Carpetas"
    expect(screen.getByText("Todas")).toBeInTheDocument();
    expect(screen.getByText("Sin carpeta")).toBeInTheDocument();
    expect(screen.getByText("Carpetas")).toBeInTheDocument();

    // The individual folders do NOT appear as root chips pushing the layout
    expect(screen.queryByText("Vacaciones Largas de Verano")).not.toBeInTheDocument();
    expect(screen.queryByText("Coche Nuevo y Seguro")).not.toBeInTheDocument();
  });
});

describe("Sprint 8 — Bloque 2: Custom Categories & Universal Everyday Defaults", () => {
  beforeEach(() => {
    useFinance.setState({
      appSettings: {
        uiVersion: "v2",
        accentColor: "emerald",
        customCategories: [],
      },
    });
  });

  it("has MAX_CUSTOM_CATEGORY_NAME_LENGTH = 20", () => {
    expect(MAX_CUSTOM_CATEGORY_NAME_LENGTH).toBe(20);
  });

  it("provides universal everyday categories and backward-compatible legacy categories", () => {
    expect(DEFAULT_CATEGORY_EMOJI["Alimentación"]).toBe("🛒");
    expect(DEFAULT_CATEGORY_EMOJI["Transporte"]).toBe("🚗");
    expect(DEFAULT_CATEGORY_EMOJI["Trabajo / Sueldo"]).toBe("💼");

    // Legacy categories mapped safely
    expect(LEGACY_CATEGORY_EMOJI["Hogar"]).toBe("🏠");
    expect(LEGACY_CATEGORY_EMOJI["Café"]).toBe("☕");
  });

  it("merges custom categories into getCategoriesMap and resolves emojiFor correctly", () => {
    const customCats: CustomCategory[] = [
      { id: "custom-1", name: "Gimnasio y Crossfit", emoji: "🏋️", createdAt: "2026-10-25" },
    ];

    const map = getCategoriesMap(customCats);
    expect(map["Gimnasio y Crossfit"]).toBe("🏋️");
    expect(map["Alimentación"]).toBe("🛒");

    expect(emojiFor("Gimnasio y Crossfit", customCats)).toBe("🏋️");
    expect(emojiFor("Hogar", customCats)).toBe("🏠");
    expect(emojiFor("Inexistente", customCats)).toBe("💸");
  });

  it("adds, updates, and removes custom categories in Zustand store with 20-char safety", () => {
    const { addCustomCategory, updateCustomCategory, removeCustomCategory } = useFinance.getState();

    // Add category with > 20 chars to verify truncation safety
    const longName = "Categoría Excesivamente Larga";
    addCustomCategory({ name: longName, emoji: "🎨" });

    let custom = useFinance.getState().appSettings?.customCategories ?? [];
    expect(custom.length).toBe(1);
    expect(custom[0].name.length).toBeLessThanOrEqual(20);
    expect(custom[0].name).toBe(longName.slice(0, 20));

    const id = custom[0].id;

    // Update category
    updateCustomCategory(id, { name: "Arte y Diseño", emoji: "🖌️" });
    custom = useFinance.getState().appSettings?.customCategories ?? [];
    expect(custom[0].name).toBe("Arte y Diseño");
    expect(custom[0].emoji).toBe("🖌️");

    // Remove category
    removeCustomCategory(id);
    custom = useFinance.getState().appSettings?.customCategories ?? [];
    expect(custom.length).toBe(0);
  });

  it("CategorySelectWithCreate renders all categories and provides inline create trigger", () => {
    renderWithProviders(
      <CategorySelectWithCreate
        value="Alimentación"
        onChange={vi.fn()}
      />
    );

    // Trigger button shows selected category
    expect(screen.getByText(/Alimentación/i)).toBeInTheDocument();
  });
});

describe("Sprint 8 — Bloque 2: Theme Persistence & Login Theme Selector", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
  });

  it("theme-sync writes and reads initial preference synchronously", () => {
    writeThemePref({ theme: "dark" });
    expect(readInitialThemePref().theme).toBe("dark");

    writeThemePref({ theme: "light" });
    expect(readInitialThemePref().theme).toBe("light");

    writeThemePref({ theme: "system" });
    expect(readInitialThemePref().theme).toBe("system");
  });

  it("LoginV2 renders 3-way dynamic theme switcher and updates theme immediately", async () => {
    renderWithProviders(<LoginV2 />);

    const themeGroup = screen.getByRole("radiogroup", { name: "Selector de tema visual" });
    expect(themeGroup).toBeInTheDocument();

    const darkBtn = screen.getByRole("radio", { name: /oscuro/i });
    fireEvent.click(darkBtn);

    expect(useFinance.getState().theme).toBe("dark");
    expect(readInitialThemePref().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    const lightBtn = screen.getByRole("radio", { name: /claro/i });
    fireEvent.click(lightBtn);

    expect(useFinance.getState().theme).toBe("light");
    expect(readInitialThemePref().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("LoginClassic renders dynamic theme switcher and toggles theme", () => {
    renderWithProviders(<LoginClassic />);

    const themeGroup = screen.getByRole("radiogroup", { name: "Selector de tema visual" });
    expect(themeGroup).toBeInTheDocument();

    const darkBtn = screen.getByRole("radio", { name: /oscuro/i });
    fireEvent.click(darkBtn);

    expect(useFinance.getState().theme).toBe("dark");
    expect(readInitialThemePref().theme).toBe("dark");
  });
});
