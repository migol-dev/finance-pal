import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SeguridadSection } from "@/pages/ajustes/secciones/SeguridadSection";
import { AjustesV2 } from "@/pages/ajustes/AjustesV2";
import { AjustesHub } from "@/pages/ajustes/AjustesHub";
import type { VersionInfo } from "@/lib/version-check";

const mockCheckAuto = vi.fn();
const mockCheckManual = vi.fn();
const mockDownloadUpdate = vi.fn();
const mockDismissBanner = vi.fn();
const mockResetForTest = vi.fn();
const mockResetAll = vi.fn();

interface MockAppUpdateState {
  isNativeAndroid: boolean;
  currentVersion: string;
  updateInfo: VersionInfo | null;
  checking: boolean;
  downloading: boolean;
  error: string | null;
  lastCheckedAt: number | null;
  bannerDismissedInSession: boolean;
  shouldShowBanner: boolean;
  checkAuto: typeof mockCheckAuto;
  checkManual: typeof mockCheckManual;
  downloadUpdate: typeof mockDownloadUpdate;
  dismissBanner: typeof mockDismissBanner;
  resetForTest: typeof mockResetForTest;
}

let mockUpdateState: MockAppUpdateState;

vi.mock("@/hooks/useAppUpdate", () => ({
  useAppUpdate: () => mockUpdateState,
}));

vi.mock("@/lib/version-check", () => ({
  getCurrentVersion: vi.fn(() => "2.0.0"),
  formatApkSize: vi.fn((bytes?: number | null) => {
    if (!bytes || bytes <= 0) return null;
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${Math.round(bytes / 1024)} KB`;
  }),
}));

vi.mock("@/hooks/useFinanceData", () => ({
  useFinanceData: () => ({
    resetAll: mockResetAll,
    profile: { name: "Usuario Prueba", currency: "MXN" },
    accounts: [],
    fixedItems: [],
    customCategories: [],
    appSettings: {
      uiVersion: "v2",
      accentColor: "emerald",
      accessibility: { textScalePercent: 100 },
      notifications: { enabled: true },
    },
  }),
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    user: null,
    profile: null,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  isSupabaseEnabled: false,
}));

const sampleUpdateInfo: VersionInfo = {
  current: "2.0.0",
  latest: "2.1.0",
  tagName: "v2.1.0",
  hasUpdate: true,
  releaseUrl: "https://github.com/migol-dev/finance-pal/releases/tag/v2.1.0",
  apkDownloadUrl:
    "https://github.com/migol-dev/finance-pal/releases/download/v2.1.0/financemate.apk",
  apkSizeBytes: 2621440,
  releaseNotes: "- Descarga directa APK\n- Ajustes V2 renovados",
  publishedAt: "2026-11-14T12:00:00Z",
  isPreRelease: false,
};

function createBaseState(
  overrides: Partial<MockAppUpdateState> = {}
): MockAppUpdateState {
  return {
    isNativeAndroid: false,
    currentVersion: "2.0.0",
    updateInfo: null,
    checking: false,
    downloading: false,
    error: null,
    lastCheckedAt: null,
    bannerDismissedInSession: false,
    shouldShowBanner: false,
    checkAuto: mockCheckAuto,
    checkManual: mockCheckManual,
    downloadUpdate: mockDownloadUpdate,
    dismissBanner: mockDismissBanner,
    resetForTest: mockResetForTest,
    ...overrides,
  };
}

describe("SeguridadSection y Ajustes — Actualizaciones APK V2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateState = createBaseState();
  });

  it("en Web/PC muestra versión actual sin controles de APK ni botón Buscar actualización", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: false,
      currentVersion: "",
      updateInfo: sampleUpdateInfo,
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    expect(screen.getByText("Versión y Actualizaciones")).toBeInTheDocument();
    expect(screen.getByText("Versión actual: v2.0.0")).toBeInTheDocument();
    expect(screen.getByText("Cifrado local (AES-GCM)")).toBeInTheDocument();
    expect(screen.getByText("Bitácora de auditoría")).toBeInTheDocument();
    expect(screen.getByText("Zona de peligro")).toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Buscar actualización/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Descargar financemate\.apk/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /Ver novedades/i })).toBeNull();
  });

  it("en Android nativo renderiza 'Buscar actualización' y dispara checkManual() al pulsar", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      currentVersion: "2.0.0",
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    expect(
      screen.getByText("Verifica si hay una nueva versión en GitHub")
    ).toBeInTheDocument();
    const checkBtn = screen.getByRole("button", { name: /Buscar actualización/i });
    expect(checkBtn).toBeEnabled();

    fireEvent.click(checkBtn);
    expect(mockCheckManual).toHaveBeenCalledTimes(1);
  });

  it("en Android muestra estado al día cuando ya comprobó y no hay actualización", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      currentVersion: "2.0.0",
      lastCheckedAt: 1700000000000,
      updateInfo: {
        ...sampleUpdateInfo,
        latest: "2.0.0",
        tagName: "v2.0.0",
        hasUpdate: false,
      },
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    expect(screen.getByText("Estás en la última versión")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Descargar financemate\.apk/i })).toBeNull();
  });

  it("en Android deshabilita 'Buscar actualización' y muestra spinner durante checking", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      checking: true,
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    const checkBtn = screen.getByRole("button", { name: /Buscar actualización/i });
    expect(checkBtn).toBeDisabled();
    expect(checkBtn.querySelector("svg")?.getAttribute("class")).toContain("animate-spin");
  });

  it("en Android muestra error recuperable cuando falla la comprobación", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      error: "No se pudo comprobar si hay actualizaciones. Verifica tu conexión.",
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    expect(
      screen.getByText("No se pudo comprobar si hay actualizaciones. Verifica tu conexión.")
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Buscar actualización/i })
    ).toBeEnabled();
  });

  it("en Android con hasUpdate muestra v2.1.0, tamaño, acordeón Ver novedades y CTA Descargar financemate.apk", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      currentVersion: "2.0.0",
      lastCheckedAt: 1700000000000,
      updateInfo: sampleUpdateInfo,
    });

    render(<SeguridadSection onBack={vi.fn()} />);

    expect(screen.getByText("Actualización disponible")).toBeInTheDocument();
    expect(screen.getByText("v2.1.0")).toBeInTheDocument();
    expect(screen.getByText("2.5 MB")).toBeInTheDocument();

    const notesBtn = screen.getByRole("button", { name: /Ver novedades/i });
    expect(notesBtn).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/Descarga directa APK/i)).toBeNull();

    fireEvent.click(notesBtn);
    expect(notesBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/Descarga directa APK/i)).toBeInTheDocument();

    const downloadBtn = screen.getByRole("button", {
      name: /Descargar financemate\.apk/i,
    });
    fireEvent.click(downloadBtn);
    expect(mockDownloadUpdate).toHaveBeenCalledTimes(1);
    expect(mockDownloadUpdate).toHaveBeenCalledWith(sampleUpdateInfo);
  });

  it("AjustesV2 muestra badge destacado 'Actualización v2.1.0' en 09 Seguridad y Sistema en Android", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      currentVersion: "2.0.0",
      updateInfo: sampleUpdateInfo,
    });

    render(
      <MemoryRouter initialEntries={["/ajustes"]}>
        <AjustesV2 />
      </MemoryRouter>
    );

    expect(screen.getByText("09")).toBeInTheDocument();
    expect(screen.getByText("Seguridad y Sistema")).toBeInTheDocument();

    const badge = screen.getByText("Actualización v2.1.0");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-primary");
    expect(badge.className).toContain("bg-primary/10");
    expect(badge.className).toContain("border-primary/30");
    expect(screen.getByText("Finance Pal v2.0.0")).toBeInTheDocument();
  });

  it("AjustesV2 muestra 'v2.0.0' en 09 Seguridad y Sistema en Web/PC sin actualización", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: false,
      currentVersion: "2.0.0",
      updateInfo: sampleUpdateInfo,
    });

    render(
      <MemoryRouter initialEntries={["/ajustes"]}>
        <AjustesV2 />
      </MemoryRouter>
    );

    expect(screen.queryByText("Actualización v2.1.0")).toBeNull();
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
    expect(screen.getByText("Finance Pal v2.0.0")).toBeInTheDocument();
  });

  it("AjustesHub muestra badge 'Actualización v2.1.0' cuando hay actualización en Android", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: true,
      currentVersion: "2.0.0",
      updateInfo: sampleUpdateInfo,
    });

    render(
      <MemoryRouter initialEntries={["/ajustes"]}>
        <AjustesHub onSelectSection={vi.fn()} />
      </MemoryRouter>
    );

    const badge = screen.getByText("Actualización v2.1.0");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("text-primary");
    expect(
      screen.getByText(/Finance Pal v2\.0\.0 • Todos tus datos son seguros y locales/)
    ).toBeInTheDocument();
  });

  it("AjustesHub muestra badge 'v2.0.0' en Web/PC sin actualización", () => {
    mockUpdateState = createBaseState({
      isNativeAndroid: false,
      currentVersion: "2.0.0",
      updateInfo: sampleUpdateInfo,
    });

    render(
      <MemoryRouter initialEntries={["/ajustes"]}>
        <AjustesHub onSelectSection={vi.fn()} />
      </MemoryRouter>
    );

    expect(screen.queryByText("Actualización v2.1.0")).toBeNull();
    expect(screen.getByText("v2.0.0")).toBeInTheDocument();
  });
});
