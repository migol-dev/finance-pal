import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const {
  mockIsNativePlatform,
  mockAppGetInfo,
  mockBrowserOpen,
  mockToastError,
} = vi.hoisted(() => ({
  mockIsNativePlatform: vi.fn(() => false),
  mockAppGetInfo: vi.fn(async () => ({ version: '2.0.0', build: '20000', id: 'app.financepal.com', name: 'Finance Pal' })),
  mockBrowserOpen: vi.fn(async () => undefined),
  mockToastError: vi.fn(),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mockIsNativePlatform,
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    getInfo: mockAppGetInfo,
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: mockBrowserOpen,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

import {
  APK_ASSET_NAME,
  CHECK_INTERVAL_HOURS,
  GITHUB_REPO,
  VERSION_CHECK_KEY,
  checkForUpdates,
  compareVersions,
  dismissVersion,
  downloadApkUpdate,
  fetchLatestVersion,
  formatApkSize,
  getCurrentVersion,
  getInstalledAppVersion,
  isTrustedApkDownloadUrl,
  isTrustedGithubReleaseUrl,
  isVersionDismissed,
  type VersionInfo,
} from '@/lib/version-check';
import { useAppUpdate, useAppUpdateStore } from '@/hooks/useAppUpdate';

function buildGitHubRelease(overrides: Record<string, unknown> = {}) {
  return {
    tag_name: 'v2.1.0',
    html_url: `https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`,
    body: '- Descarga directa de APK\n- Mejoras de rendimiento',
    published_at: '2026-05-07T10:00:00Z',
    prerelease: false,
    draft: false,
    assets: [
      {
        name: APK_ASSET_NAME,
        browser_download_url: `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0/${APK_ASSET_NAME}`,
        size: Math.round(2.5 * 1024 * 1024),
      },
    ],
    ...overrides,
  };
}

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

describe('version-check engine & useAppUpdate store', () => {
  const originalFetch = globalThis.fetch;
  const originalWindowOpen = window.open;
  let nowMs = new Date('2026-05-07T12:00:00Z').getTime();
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockWindowOpen: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    nowMs = new Date('2026-05-07T12:00:00Z').getTime();
    vi.spyOn(Date, 'now').mockImplementation(() => nowMs);
    localStorage.clear();

    mockIsNativePlatform.mockReset();
    mockIsNativePlatform.mockReturnValue(false);

    mockAppGetInfo.mockReset();
    mockAppGetInfo.mockResolvedValue({
      version: '2.0.0',
      build: '20000',
      id: 'app.financepal.com',
      name: 'Finance Pal',
    });

    mockBrowserOpen.mockReset();
    mockBrowserOpen.mockResolvedValue(undefined);

    mockToastError.mockReset();

    mockFetch = vi.fn();
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    mockWindowOpen = vi.fn();
    window.open = mockWindowOpen as unknown as typeof window.open;

    useAppUpdateStore.getState().resetForTest();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    window.open = originalWindowOpen;
    vi.restoreAllMocks();
  });

  describe('1. compareVersions (semver puro)', () => {
    it('limpia prefijo v/V y compara segmentos variables correctamente', () => {
      expect(compareVersions('v2.1.0', '2.1.0')).toBe(0);
      expect(compareVersions('V2.1', '2.1.0')).toBe(0);
      expect(compareVersions('2', '2.0.0')).toBe(0);
      expect(compareVersions('2.0.0', '2.0.0.1')).toBe(-1);
      expect(compareVersions('2.10.0', '2.2.0')).toBe(1);
      expect(compareVersions('1.19.38', '2.0.0')).toBe(-1);
    });

    it('soporta sufijos pre-release sin producir NaN', () => {
      expect(compareVersions('2.1.0-beta.1', '2.1.0')).toBe(-1);
      expect(compareVersions('2.1.0', '2.1.0-beta.1')).toBe(1);
      expect(compareVersions('2.1.0-alpha.1', '2.1.0-beta.1')).toBe(-1);
      expect(compareVersions('2.1.0-beta.2', '2.1.0-beta.10')).toBe(-1);
      expect(compareVersions('2.1.0-rc.1', '2.1.0-beta.9')).toBe(1);
      expect(compareVersions('2.1.0+build.12', '2.1.0')).toBe(0);
      expect(Number.isNaN(compareVersions('invalid', '2.0.0'))).toBe(false);
    });
  });

  describe('2. Validadores de URL confiable (allowlist)', () => {
    it('acepta únicamente URLs HTTPS confiables de GitHub para el repositorio', () => {
      expect(
        isTrustedGithubReleaseUrl(`https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`)
      ).toBe(true);
      expect(
        isTrustedApkDownloadUrl(
          `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0/${APK_ASSET_NAME}`
        )
      ).toBe(true);
      expect(
        isTrustedApkDownloadUrl(
          'https://objects.githubusercontent.com/github-production-release-asset/123/financemate.apk'
        )
      ).toBe(true);
      expect(
        isTrustedApkDownloadUrl(
          'https://release-assets.githubusercontent.com/github-production-release-asset/123/financemate.apk'
        )
      ).toBe(true);
      expect(
        isTrustedApkDownloadUrl(
          'https://github-releases.githubusercontent.com/123/456/financemate.apk'
        )
      ).toBe(true);
    });

    it('rechaza HTTP inseguro, otros repositorios, traversal, subdominios falsos y esquemas peligrosos', () => {
      const badUrls = [
        `http://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`,
        'https://github.com/attacker/finance-pal/releases/download/v2.1.0/financemate.apk',
        'https://github.com/migol-dev/finance-pal-evil/releases/tag/v2.1.0',
        'https://github.com/migol-dev/finance-pal/../attacker/releases',
        'https://evil.objects.githubusercontent.com/financemate.apk',
        'https://user:pass@objects.githubusercontent.com/financemate.apk',
        'https://objects.githubusercontent.com/',
        'https://evil.com/financemate.apk',
        'javascript:alert(1)',
        'intent://scan/#Intent;end',
        '',
        null,
        undefined,
      ];

      for (const url of badUrls) {
        expect(isTrustedGithubReleaseUrl(url)).toBe(false);
        expect(isTrustedApkDownloadUrl(url)).toBe(false);
      }

      // CDN hosts solo aplican para APK download, no como pagina de release
      expect(
        isTrustedGithubReleaseUrl('https://objects.githubusercontent.com/some/asset.apk')
      ).toBe(false);
    });
  });

  describe('3. formatApkSize', () => {
    it('formatea tamaños válidos y retorna null para valores inválidos', () => {
      expect(formatApkSize(Math.round(2.5 * 1024 * 1024))).toBe('2.5 MB');
      expect(formatApkSize(840 * 1024)).toBe('840 KB');
      expect(formatApkSize(12.5 * 1024)).toBe('12.5 KB');
      expect(formatApkSize(512)).toBe('512 B');
      expect(formatApkSize(0)).toBeNull();
      expect(formatApkSize(-100)).toBeNull();
      expect(formatApkSize(null)).toBeNull();
      expect(formatApkSize(undefined)).toBeNull();
      expect(formatApkSize(Number.NaN)).toBeNull();
    });
  });

  describe('4. getInstalledAppVersion', () => {
    it('retorna versión de build en Web sin invocar CapApp.getInfo', async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const version = await getInstalledAppVersion();
      expect(version).toBe(getCurrentVersion());
      expect(mockAppGetInfo).not.toHaveBeenCalled();
    });

    it('en Android nativo elige el mayor semver válido entre build y CapApp.getInfo', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockAppGetInfo.mockResolvedValueOnce({
        version: 'v2.4.0',
        build: '20400',
        id: 'app.financepal.com',
        name: 'Finance Pal',
      });
      expect(await getInstalledAppVersion()).toBe('2.4.0');

      mockAppGetInfo.mockResolvedValueOnce({
        version: '1.9.0',
        build: '10900',
        id: 'app.financepal.com',
        name: 'Finance Pal',
      });
      expect(await getInstalledAppVersion()).toBe(getCurrentVersion());

      mockAppGetInfo.mockResolvedValueOnce({
        version: 'invalid-version',
        build: '1',
        id: 'app.financepal.com',
        name: 'Finance Pal',
      });
      expect(await getInstalledAppVersion()).toBe(getCurrentVersion());

      mockAppGetInfo.mockRejectedValueOnce(new Error('Native bridge unavailable'));
      expect(await getInstalledAppVersion()).toBe(getCurrentVersion());
    });
  });

  describe('5. fetchLatestVersion (GitHub releases & asset matching)', () => {
    it('parsea release estable con asset financemate.apk y tamaño exacto', async () => {
      const apkSize = 2621440; // 2.5 MB
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          buildGitHubRelease({
            assets: [
              {
                name: 'checksums.txt',
                browser_download_url: `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0/checksums.txt`,
                size: 120,
              },
              {
                name: ' FinanceMate.APK ',
                browser_download_url:
                  'https://objects.githubusercontent.com/github-production-release-asset/1/financemate.apk',
                size: apkSize,
              },
            ],
          })
        )
      );

      const info = await fetchLatestVersion('2.0.0');
      expect(info).toEqual({
        current: '2.0.0',
        latest: '2.1.0',
        tagName: 'v2.1.0',
        hasUpdate: true,
        releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`,
        apkDownloadUrl:
          'https://objects.githubusercontent.com/github-production-release-asset/1/financemate.apk',
        apkSizeBytes: apkSize,
        releaseNotes: '- Descarga directa de APK\n- Mejoras de rendimiento',
        publishedAt: '2026-05-07T10:00:00Z',
        isPreRelease: false,
      });
    });

    it('sanitiza URLs no confiables en el payload de GitHub', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(
          buildGitHubRelease({
            html_url: 'https://evil.com/phishing-release',
            assets: [
              {
                name: APK_ASSET_NAME,
                browser_download_url: 'https://evil.com/malware.apk',
                size: 999999,
              },
            ],
          })
        )
      );

      const info = await fetchLatestVersion('2.0.0');
      expect(info).not.toBeNull();
      expect(info?.apkDownloadUrl).toBeNull();
      expect(info?.releaseUrl).toBe(`https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`);
    });

    it('ignora drafts, prereleases y tags arbitrarios', async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse(buildGitHubRelease({ prerelease: true, tag_name: 'v2.2.0-beta.1' }))
      );
      expect(await fetchLatestVersion('2.0.0')).toBeNull();

      mockFetch.mockResolvedValueOnce(
        jsonResponse(buildGitHubRelease({ draft: true, tag_name: 'v2.2.0' }))
      );
      expect(await fetchLatestVersion('2.0.0')).toBeNull();

      mockFetch.mockResolvedValueOnce(
        jsonResponse(buildGitHubRelease({ tag_name: 'nightly-build' }))
      );
      expect(await fetchLatestVersion('2.0.0')).toBeNull();
    });

    it('si /releases/latest falla, busca primera release estable en /releases?per_page=10', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ message: 'Not Found' }, false, 404))
        .mockResolvedValueOnce(
          jsonResponse([
            buildGitHubRelease({ tag_name: 'v2.3.0-rc.1', prerelease: true }),
            buildGitHubRelease({ tag_name: 'v2.2.5', draft: true }),
            buildGitHubRelease({ tag_name: 'v2.2.0', prerelease: false, draft: false }),
          ])
        );

      const info = await fetchLatestVersion('2.0.0');
      expect(info?.latest).toBe('2.2.0');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[1][0]).toBe(
        `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`
      );
    });

    it('retorna null si /releases?per_page=10 solo contiene pre-releases (sin fallback a tags)', async () => {
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ message: 'Not Found' }, false, 404))
        .mockResolvedValueOnce(
          jsonResponse([buildGitHubRelease({ tag_name: 'v2.3.0-beta.1', prerelease: true })])
        );

      const info = await fetchLatestVersion('2.0.0');
      expect(info).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('6. Gating Web vs Android & corrección del bug de persistencia de descarte', () => {
    it('bloquea checkForUpdates completamente en Web/PC sin realizar fetch', async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const resDefault = await checkForUpdates();
      const resForced = await checkForUpdates({ force: true, includeDismissed: true });

      expect(resDefault).toBeNull();
      expect(resForced).toBeNull();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('preserva dismissedVersion tras pasar el intervalo de 6h y reaparece solo ante una versión mayor', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockFetch.mockResolvedValue(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));

      const first = await checkForUpdates();
      expect(first?.latest).toBe('9.1.0');
      expect(first?.hasUpdate).toBe(true);

      dismissVersion('9.1.0');
      expect(isVersionDismissed('9.1.0')).toBe(true);

      // Avanzar 7 horas (> CHECK_INTERVAL_HOURS)
      nowMs += (CHECK_INTERVAL_HOURS + 1) * 60 * 60 * 1000;

      // Debe consultar GitHub de nuevo pero preservar dismissedVersion y retornar null
      const afterInterval = await checkForUpdates();
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(afterInterval).toBeNull();
      expect(isVersionDismissed('9.1.0')).toBe(true);

      const stored = JSON.parse(localStorage.getItem(VERSION_CHECK_KEY) || '{}');
      expect(stored.dismissedVersion).toBe('9.1.0');
      expect(stored.cachedInfo?.latest).toBe('9.1.0');

      // Avanzar otras 7 horas cuando aparece v9.2.0
      nowMs += (CHECK_INTERVAL_HOURS + 1) * 60 * 60 * 1000;
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: 'v9.2.0' })));

      const newer = await checkForUpdates();
      expect(newer?.latest).toBe('9.2.0');
      expect(newer?.hasUpdate).toBe(true);
    });

    it('usa caché dentro de las 6h recalculando hasUpdate contra versión instalada', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));

      const first = await checkForUpdates();
      expect(first?.hasUpdate).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // 1 hora después, sin force: usa caché, sin fetch
      nowMs += 60 * 60 * 1000;
      const cached = await checkForUpdates();
      expect(cached?.latest).toBe('9.1.0');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Si el usuario ya actualizó nativamente a 9.1.0, caché debe devolver null sin fetch
      mockAppGetInfo.mockResolvedValueOnce({
        version: '9.1.0',
        build: '90100',
        id: 'app.financepal.com',
        name: 'Finance Pal',
      });
      const alreadyUpdated = await checkForUpdates();
      expect(alreadyUpdated).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('con force: true retorna VersionInfo incluso al día o descartado si includeDismissed es true', async () => {
      const current = getCurrentVersion();
      mockIsNativePlatform.mockReturnValue(true);
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: `v${current}` })));

      const upToDate = await checkForUpdates({ force: true });
      expect(upToDate?.latest).toBe(current);
      expect(upToDate?.hasUpdate).toBe(false);

      dismissVersion('9.1.0');
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));
      const forcedDismissed = await checkForUpdates({ force: true, includeDismissed: true });
      expect(forcedDismissed?.latest).toBe('9.1.0');
      expect(forcedDismissed?.hasUpdate).toBe(true);
    });
  });

  describe('7. downloadApkUpdate', () => {
    const baseInfo: VersionInfo = {
      current: '2.0.0',
      latest: '2.1.0',
      tagName: 'v2.1.0',
      hasUpdate: true,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/v2.1.0`,
      apkDownloadUrl: `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0/${APK_ASSET_NAME}`,
      apkSizeBytes: 2621440,
      isPreRelease: false,
    };

    it('en Android nativo abre el APK directo con Browser.open', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      const res = await downloadApkUpdate(baseInfo);

      expect(res).toEqual({ started: true, usedFallbackReleasePage: false });
      expect(mockBrowserOpen).toHaveBeenCalledWith({ url: baseInfo.apkDownloadUrl });
      expect(mockWindowOpen).not.toHaveBeenCalled();
    });

    it('si falta apkDownloadUrl usa fallback a releaseUrl confiable', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      const res = await downloadApkUpdate({ ...baseInfo, apkDownloadUrl: null });

      expect(res).toEqual({ started: true, usedFallbackReleasePage: true });
      expect(mockBrowserOpen).toHaveBeenCalledWith({ url: baseInfo.releaseUrl });
    });

    it('en entorno no nativo usa window.open con noopener,noreferrer', async () => {
      mockIsNativePlatform.mockReturnValue(false);
      const res = await downloadApkUpdate(baseInfo);

      expect(res).toEqual({ started: true, usedFallbackReleasePage: false });
      expect(mockWindowOpen).toHaveBeenCalledWith(
        baseInfo.apkDownloadUrl,
        '_blank',
        'noopener,noreferrer'
      );
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });

    it('lanza Error si ni apkDownloadUrl ni releaseUrl son confiables', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      await expect(
        downloadApkUpdate({
          ...baseInfo,
          apkDownloadUrl: 'https://evil.com/bad.apk',
          releaseUrl: 'https://evil.com/release',
        })
      ).rejects.toThrow();
      expect(mockBrowserOpen).not.toHaveBeenCalled();
    });
  });

  describe('8. Hook y Store useAppUpdate (checkAuto / checkManual / downloadUpdate / dismissBanner)', () => {
    it('permanece inactivo en Web/PC', async () => {
      mockIsNativePlatform.mockReturnValue(false);
      useAppUpdateStore.getState().resetForTest();

      const { result } = renderHook(() => useAppUpdate());
      expect(result.current.isNativeAndroid).toBe(false);
      expect(result.current.shouldShowBanner).toBe(false);

      await act(async () => {
        expect(await result.current.checkAuto()).toBeNull();
        expect(await result.current.checkManual()).toBeNull();
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('en Android deduplica checkAuto concurrentes y controla show/dismiss del banner', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      useAppUpdateStore.getState().resetForTest();

      mockFetch.mockResolvedValue(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));

      const { result } = renderHook(() => useAppUpdate());
      expect(result.current.isNativeAndroid).toBe(true);

      await act(async () => {
        await Promise.all([result.current.checkAuto(), result.current.checkAuto()]);
      });

      // Solo 1 petición HTTP gracias a la deduplicación concurrente
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result.current.updateInfo?.latest).toBe('9.1.0');
      expect(result.current.shouldShowBanner).toBe(true);
      expect(result.current.lastCheckedAt).toBe(nowMs);

      act(() => {
        result.current.dismissBanner();
      });

      expect(result.current.bannerDismissedInSession).toBe(true);
      expect(result.current.shouldShowBanner).toBe(false);
      expect(isVersionDismissed('9.1.0')).toBe(true);
    });

    it('checkManual muestra error legible en fallo y no reabre banner si la versión fue descartada', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      dismissVersion('9.1.0');
      useAppUpdateStore.getState().resetForTest();

      const { result } = renderHook(() => useAppUpdate());

      // Fallo de red
      mockFetch.mockRejectedValueOnce(new Error('Network down'));
      await act(async () => {
        const res = await result.current.checkManual();
        expect(res).toBeNull();
      });
      expect(result.current.checking).toBe(false);
      expect(result.current.error).toBe(
        'No se pudo comprobar si hay actualizaciones. Verifica tu conexión.'
      );

      // Respuesta exitosa de versión previamente descartada
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));
      await act(async () => {
        const res = await result.current.checkManual();
        expect(res?.latest).toBe('9.1.0');
      });
      expect(result.current.error).toBeNull();
      expect(result.current.updateInfo?.hasUpdate).toBe(true);
      expect(result.current.bannerDismissedInSession).toBe(true);
      expect(result.current.shouldShowBanner).toBe(false);
    });

    it('downloadUpdate abre Browser.open, cierra banner y muestra toast.error si falla', async () => {
      mockIsNativePlatform.mockReturnValue(true);
      useAppUpdateStore.getState().resetForTest();
      mockFetch.mockResolvedValueOnce(jsonResponse(buildGitHubRelease({ tag_name: 'v9.1.0' })));

      const { result } = renderHook(() => useAppUpdate());

      await act(async () => {
        await result.current.checkAuto();
      });
      expect(result.current.shouldShowBanner).toBe(true);

      await act(async () => {
        await result.current.downloadUpdate();
      });

      expect(mockBrowserOpen).toHaveBeenCalledWith({
        url: `https://github.com/${GITHUB_REPO}/releases/download/v2.1.0/${APK_ASSET_NAME}`,
      });
      expect(result.current.downloading).toBe(false);
      expect(result.current.bannerDismissedInSession).toBe(true);
      expect(result.current.shouldShowBanner).toBe(false);

      // Error al abrir descarga dispara toast.error
      mockBrowserOpen.mockRejectedValueOnce(new Error('Cannot open browser'));
      await act(async () => {
        await result.current.downloadUpdate(result.current.updateInfo!);
      });
      expect(result.current.downloading).toBe(false);
      expect(mockToastError).toHaveBeenCalledWith('Cannot open browser');
    });
  });
});
