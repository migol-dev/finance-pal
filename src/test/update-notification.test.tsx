import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

const {
  mockIsNativePlatform,
  mockAddListener,
  mockRemoveListener,
  mockUseAppUpdate,
  mockCheckAuto,
  mockCheckManual,
  mockDownloadUpdate,
  mockDismissBanner,
  mockResetForTest,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(() => false),
  mockAddListener: vi.fn(),
  mockRemoveListener: vi.fn(),
  mockUseAppUpdate: vi.fn(),
  mockCheckAuto: vi.fn().mockResolvedValue(null),
  mockCheckManual: vi.fn().mockResolvedValue(null),
  mockDownloadUpdate: vi.fn().mockResolvedValue(undefined),
  mockDismissBanner: vi.fn(),
  mockResetForTest: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mockAddListener,
  },
}));

vi.mock('@/hooks/useAppUpdate', () => ({
  useAppUpdate: () => mockUseAppUpdate(),
}));

import { UpdateNotification } from '@/components/app/UpdateNotification';

const sampleUpdateInfo = {
  current: '2.0.0',
  latest: '2.1.0',
  tagName: 'v2.1.0',
  hasUpdate: true,
  releaseUrl: 'https://github.com/migol-dev/finance-pal/releases/tag/v2.1.0',
  apkDownloadUrl: 'https://github.com/migol-dev/finance-pal/releases/download/v2.1.0/financemate.apk',
  apkSizeBytes: 2_621_440,
  releaseNotes: '- Descarga directa de APK\n- Mejoras de rendimiento',
  publishedAt: '2026-11-14T18:00:00Z',
  isPreRelease: false,
};

function makeHookState(overrides: Record<string, unknown> = {}) {
  return {
    isNativeAndroid: false,
    currentVersion: '2.0.0',
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

describe('UpdateNotification V2', () => {
  let appStateCallback: ((state: { isActive: boolean }) => void) | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    appStateCallback = undefined;

    mockIsNativePlatform.mockReturnValue(false);
    mockRemoveListener.mockResolvedValue(undefined);
    mockAddListener.mockImplementation(
      async (event: string, cb: (state: { isActive: boolean }) => void) => {
        if (event === 'appStateChange') {
          appStateCallback = cb;
        }
        return { remove: mockRemoveListener };
      }
    );
    mockUseAppUpdate.mockReturnValue(makeHookState());
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders null on Web/PC when !isNativeAndroid and skips native check/listeners', () => {
    mockIsNativePlatform.mockReturnValue(false);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: false,
        shouldShowBanner: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    const { container } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockCheckAuto).not.toHaveBeenCalled();
    expect(mockAddListener).not.toHaveBeenCalled();
  });

  it('renders null on Android when shouldShowBanner is false, schedules checkAuto at 1500ms, and reacts to active appStateChange', async () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: false,
        updateInfo: null,
      })
    );

    const { container, unmount } = render(<UpdateNotification />);
    expect(container.firstChild).toBeNull();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockAddListener).toHaveBeenCalledWith('appStateChange', expect.any(Function));
    expect(mockCheckAuto).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(mockCheckAuto).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(150);
    });
    expect(mockCheckAuto).toHaveBeenCalledTimes(1);

    act(() => {
      appStateCallback?.({ isActive: false });
    });
    expect(mockCheckAuto).toHaveBeenCalledTimes(1);

    act(() => {
      appStateCallback?.({ isActive: true });
    });
    expect(mockCheckAuto).toHaveBeenCalledTimes(2);

    unmount();
    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
  });

  it('renders editorial top banner on Android when shouldShowBanner && updateInfo and does not auto-hide after 30s', () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    const { container } = render(<UpdateNotification />);

    const region = screen.getByRole('region', { name: 'Actualización disponible' });
    expect(region).toBeInTheDocument();
    expect(region.className).toContain('fixed');
    expect(region.className).toContain('top-[max(0.75rem,env(safe-area-inset-top))]');
    expect(region.className).toContain('z-[90]');
    expect(region.className).not.toContain('bottom-0');

    expect(container.querySelector('.gradient-primary')).toBeNull();
    expect(container.querySelector('.animate-spin')).toBeNull();

    expect(screen.getByText('Actualización disponible')).toBeInTheDocument();
    expect(screen.getByText('Descarga directa de financemate.apk')).toBeInTheDocument();
    expect(screen.getByText('v2.0.0 -> v2.1.0')).toBeInTheDocument();
    expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Descargar APK/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Luego' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(35_000);
    });
    expect(screen.getByRole('region', { name: 'Actualización disponible' })).toBeInTheDocument();
  });

  it('toggles Ver novedades accordion cleanly', () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    render(<UpdateNotification />);

    const toggle = screen.getByRole('button', { name: /Ver novedades/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Mejoras de rendimiento/)).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/Mejoras de rendimiento/)).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/Mejoras de rendimiento/)).toBeNull();
  });

  it('triggers downloadUpdate() on primary click and shows fallback label when apkDownloadUrl is missing', () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    const { rerender } = render(<UpdateNotification />);
    fireEvent.click(screen.getByRole('button', { name: /Descargar APK/i }));
    expect(mockDownloadUpdate).toHaveBeenCalledTimes(1);

    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        updateInfo: {
          ...sampleUpdateInfo,
          apkDownloadUrl: null,
          apkSizeBytes: null,
        },
      })
    );

    rerender(<UpdateNotification />);
    expect(screen.getByText('Disponible en GitHub Releases')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ver actualización/i })).toBeInTheDocument();
    expect(screen.queryByText('2.5 MB')).toBeNull();
  });

  it('disables CTA and shows spinner only when downloading is true', () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        downloading: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    const { container } = render(<UpdateNotification />);
    const btn = screen.getByRole('button', { name: /Iniciando descarga.../i });
    expect(btn).toBeDisabled();
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('triggers dismissBanner() when clicking Luego or X (Descartar)', () => {
    mockIsNativePlatform.mockReturnValue(true);
    mockUseAppUpdate.mockReturnValue(
      makeHookState({
        isNativeAndroid: true,
        shouldShowBanner: true,
        updateInfo: sampleUpdateInfo,
      })
    );

    render(<UpdateNotification />);

    fireEvent.click(screen.getByRole('button', { name: 'Luego' }));
    expect(mockDismissBanner).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }));
    expect(mockDismissBanner).toHaveBeenCalledTimes(2);
  });
});
