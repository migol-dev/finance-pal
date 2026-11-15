/**
 * Version Detection & Secure APK Update Engine
 * Checks GitHub releases (Android native only) and opens trusted APK download URLs
 */

import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

export const GITHUB_REPO = 'migol-dev/finance-pal';
export const APK_ASSET_NAME = 'financemate.apk';
export const VERSION_CHECK_KEY = 'finance-pal-version-check';
export const CHECK_INTERVAL_HOURS = 6;

const TRUSTED_GITHUB_ASSET_HOSTS = new Set([
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
  'github-releases.githubusercontent.com',
]);

export interface VersionInfo {
  current: string;
  latest: string;
  tagName: string;
  hasUpdate: boolean;
  releaseUrl: string;
  apkDownloadUrl: string | null;
  apkSizeBytes: number | null;
  releaseNotes?: string;
  publishedAt?: string;
  isPreRelease: boolean;
}

export interface CheckForUpdatesOptions {
  force?: boolean;
  includeDismissed?: boolean;
  currentVersionOverride?: string;
}

interface StoredVersionCheckState {
  lastCheck: number;
  dismissedVersion: string | null;
  cachedInfo: VersionInfo | null;
}

interface GitHubReleaseAsset {
  name?: unknown;
  browser_download_url?: unknown;
  size?: unknown;
}

interface GitHubRelease {
  tag_name?: unknown;
  html_url?: unknown;
  body?: unknown;
  published_at?: unknown;
  prerelease?: unknown;
  draft?: unknown;
  assets?: unknown;
}

interface ParsedSemver {
  core: number[];
  pre: string[];
}

function normalizeVersionTag(version: string): string {
  return String(version ?? '').trim().replace(/^[vV]/, '');
}

function parseSemver(version: string): ParsedSemver | null {
  const cleaned = normalizeVersionTag(version);
  if (!cleaned) return null;

  const plusIdx = cleaned.indexOf('+');
  const withoutBuild = plusIdx === -1 ? cleaned : cleaned.slice(0, plusIdx);

  const dashIdx = withoutBuild.indexOf('-');
  const corePart = dashIdx === -1 ? withoutBuild : withoutBuild.slice(0, dashIdx);
  const prePart = dashIdx === -1 ? '' : withoutBuild.slice(dashIdx + 1);

  if (!corePart || !/^\d+(\.\d+)*$/.test(corePart)) {
    return null;
  }
  if (dashIdx !== -1 && !prePart) {
    return null;
  }

  const core = corePart.split('.').map((segment) => Number.parseInt(segment, 10));
  if (core.some((num) => !Number.isFinite(num))) {
    return null;
  }

  const pre = prePart ? prePart.split('.').filter(Boolean) : [];
  return { core, pre };
}

function parseSemverFallback(version: string): ParsedSemver {
  const strict = parseSemver(version);
  if (strict) return strict;

  const cleaned = normalizeVersionTag(version).split('+')[0];
  const dashIdx = cleaned.indexOf('-');
  const corePart = dashIdx === -1 ? cleaned : cleaned.slice(0, dashIdx);
  const prePart = dashIdx === -1 ? '' : cleaned.slice(dashIdx + 1);

  const core = corePart
    .split('.')
    .map((segment) => {
      const match = /^(\d+)/.exec(segment);
      return match ? Number.parseInt(match[1], 10) : 0;
    });

  const pre = prePart ? prePart.split('.').filter(Boolean) : [];
  return {
    core: core.length > 0 ? core : [0],
    pre,
  };
}

function comparePreRelease(preA: string[], preB: string[]): number {
  if (preA.length === 0 && preB.length === 0) return 0;
  if (preA.length === 0) return 1;
  if (preB.length === 0) return -1;

  const maxLen = Math.max(preA.length, preB.length);
  for (let i = 0; i < maxLen; i++) {
    const idA = preA[i];
    const idB = preB[i];
    if (idA === undefined) return -1;
    if (idB === undefined) return 1;

    const isNumA = /^\d+$/.test(idA);
    const isNumB = /^\d+$/.test(idB);

    if (isNumA && isNumB) {
      const numA = Number.parseInt(idA, 10);
      const numB = Number.parseInt(idB, 10);
      if (numA < numB) return -1;
      if (numA > numB) return 1;
    } else if (isNumA !== isNumB) {
      return isNumA ? -1 : 1;
    } else {
      if (idA < idB) return -1;
      if (idA > idB) return 1;
    }
  }

  return 0;
}

/**
 * Compare semantic versions (returns -1 if a < b, 0 if equal, 1 if a > b)
 */
export function compareVersions(a: string, b: string): number {
  const pa = parseSemverFallback(a);
  const pb = parseSemverFallback(b);

  const maxLen = Math.max(pa.core.length, pb.core.length);
  for (let i = 0; i < maxLen; i++) {
    const na = pa.core[i] ?? 0;
    const nb = pb.core[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }

  return comparePreRelease(pa.pre, pb.pre);
}

function parseTrustedHttpsUrl(rawUrl: string | null | undefined): URL | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (parsed.port) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isTrustedGithubReleaseUrl(rawUrl: string | null | undefined): boolean {
  const parsed = parseTrustedHttpsUrl(rawUrl);
  if (!parsed) return false;
  if (parsed.hostname.toLowerCase() !== 'github.com') return false;
  return parsed.pathname.toLowerCase().startsWith(`/${GITHUB_REPO.toLowerCase()}/`);
}

export function isTrustedApkDownloadUrl(rawUrl: string | null | undefined): boolean {
  const parsed = parseTrustedHttpsUrl(rawUrl);
  if (!parsed) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'github.com') {
    return parsed.pathname.toLowerCase().startsWith(`/${GITHUB_REPO.toLowerCase()}/`);
  }
  return TRUSTED_GITHUB_ASSET_HOSTS.has(host) && parsed.pathname.length > 1;
}

/**
 * Get current app version from build-time env or fallback
 */
export function getCurrentVersion(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  return '2.0.0';
}

/**
 * Resolve installed version on Android native (higher valid semver between build and native info)
 */
export async function getInstalledAppVersion(): Promise<string> {
  const buildVersion = getCurrentVersion();

  if (!Capacitor.isNativePlatform()) {
    return buildVersion;
  }

  try {
    const info = await CapApp.getInfo();
    const nativeRaw = typeof info?.version === 'string' ? normalizeVersionTag(info.version) : '';
    const nativeParsed = parseSemver(nativeRaw);
    if (!nativeParsed) {
      return buildVersion;
    }

    const buildNormalized = normalizeVersionTag(buildVersion);
    const buildParsed = parseSemver(buildNormalized);
    if (!buildParsed) {
      return nativeRaw;
    }

    return compareVersions(nativeRaw, buildNormalized) >= 0 ? nativeRaw : buildVersion;
  } catch {
    return buildVersion;
  }
}

function isStableRelease(release: unknown): release is GitHubRelease {
  if (!release || typeof release !== 'object') return false;
  const candidate = release as GitHubRelease;
  return !candidate.draft && !candidate.prerelease && typeof candidate.tag_name === 'string';
}

function buildFallbackReleaseUrl(tagName: string): string {
  return `https://github.com/${GITHUB_REPO}/releases/tag/${encodeURIComponent(tagName)}`;
}

function mapReleaseToVersionInfo(release: GitHubRelease, current: string): VersionInfo | null {
  if (!isStableRelease(release)) return null;

  const tagName = String(release.tag_name).trim();
  const latest = normalizeVersionTag(tagName);
  if (!latest || !parseSemver(latest)) {
    return null;
  }

  const assets = Array.isArray(release.assets) ? (release.assets as GitHubReleaseAsset[]) : [];
  const apkAsset = assets.find(
    (asset) =>
      asset &&
      typeof asset === 'object' &&
      typeof asset.name === 'string' &&
      asset.name.trim().toLowerCase() === APK_ASSET_NAME
  );

  const rawApkUrl =
    apkAsset && typeof apkAsset.browser_download_url === 'string'
      ? apkAsset.browser_download_url.trim()
      : null;
  const apkDownloadUrl = rawApkUrl && isTrustedApkDownloadUrl(rawApkUrl) ? rawApkUrl : null;
  const apkSizeBytes =
    apkAsset && typeof apkAsset.size === 'number' && Number.isFinite(apkAsset.size)
      ? apkAsset.size
      : null;

  const rawHtmlUrl = typeof release.html_url === 'string' ? release.html_url.trim() : '';
  const releaseUrl = isTrustedGithubReleaseUrl(rawHtmlUrl)
    ? rawHtmlUrl
    : buildFallbackReleaseUrl(tagName);

  const releaseNotes =
    typeof release.body === 'string' && release.body.trim().length > 0
      ? release.body
      : undefined;
  const publishedAt =
    typeof release.published_at === 'string' && release.published_at.trim().length > 0
      ? release.published_at
      : undefined;

  return {
    current,
    latest,
    tagName,
    hasUpdate: compareVersions(current, latest) < 0,
    releaseUrl,
    apkDownloadUrl,
    apkSizeBytes,
    releaseNotes,
    publishedAt,
    isPreRelease: false,
  };
}

/**
 * Fetch latest stable release from GitHub API (ignores drafts, prereleases, and arbitrary tags)
 */
export async function fetchLatestVersion(
  currentVersionOverride?: string
): Promise<VersionInfo | null> {
  try {
    const rawCurrent = currentVersionOverride ?? (await getInstalledAppVersion());
    const current = normalizeVersionTag(rawCurrent) || getCurrentVersion();
    const headers = { Accept: 'application/vnd.github+json' };

    const latestResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers }
    );

    if (latestResponse.ok) {
      const release = await latestResponse.json();
      return mapReleaseToVersionInfo(release, current);
    }

    const listResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
      { headers }
    );

    if (!listResponse.ok) {
      return null;
    }

    const releases = await listResponse.json();
    if (!Array.isArray(releases)) {
      return null;
    }

    for (const candidate of releases) {
      const mapped = mapReleaseToVersionInfo(candidate, current);
      if (mapped) {
        return mapped;
      }
    }

    return null;
  } catch (error) {
    console.warn('Version check failed:', error);
    return null;
  }
}

function sanitizeCachedInfo(value: unknown): VersionInfo | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<VersionInfo>;

  if (
    typeof candidate.latest !== 'string' ||
    typeof candidate.tagName !== 'string' ||
    typeof candidate.current !== 'string' ||
    typeof candidate.hasUpdate !== 'boolean'
  ) {
    return null;
  }

  const latest = normalizeVersionTag(candidate.latest);
  if (!latest || !parseSemver(latest)) return null;

  const tagName = candidate.tagName.trim() || `v${latest}`;
  const releaseUrl = isTrustedGithubReleaseUrl(candidate.releaseUrl)
    ? candidate.releaseUrl!
    : buildFallbackReleaseUrl(tagName);
  const apkDownloadUrl = isTrustedApkDownloadUrl(candidate.apkDownloadUrl)
    ? candidate.apkDownloadUrl!
    : null;
  const apkSizeBytes =
    typeof candidate.apkSizeBytes === 'number' && Number.isFinite(candidate.apkSizeBytes)
      ? candidate.apkSizeBytes
      : null;

  return {
    current: normalizeVersionTag(candidate.current) || getCurrentVersion(),
    latest,
    tagName,
    hasUpdate: candidate.hasUpdate,
    releaseUrl,
    apkDownloadUrl,
    apkSizeBytes,
    releaseNotes:
      typeof candidate.releaseNotes === 'string' && candidate.releaseNotes.trim().length > 0
        ? candidate.releaseNotes
        : undefined,
    publishedAt:
      typeof candidate.publishedAt === 'string' && candidate.publishedAt.trim().length > 0
        ? candidate.publishedAt
        : undefined,
    isPreRelease: Boolean(candidate.isPreRelease),
  };
}

function readVersionCheckState(): StoredVersionCheckState {
  const empty: StoredVersionCheckState = {
    lastCheck: 0,
    dismissedVersion: null,
    cachedInfo: null,
  };

  try {
    const stored = localStorage.getItem(VERSION_CHECK_KEY);
    if (!stored) return empty;

    const parsed = JSON.parse(stored) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return empty;

    const lastCheck =
      typeof parsed.lastCheck === 'number' && Number.isFinite(parsed.lastCheck)
        ? parsed.lastCheck
        : 0;

    let dismissedVersion: string | null = null;
    if (typeof parsed.dismissedVersion === 'string' && parsed.dismissedVersion.trim()) {
      dismissedVersion = normalizeVersionTag(parsed.dismissedVersion);
    } else if (parsed.dismissed === true && typeof parsed.lastSeenVersion === 'string') {
      dismissedVersion = normalizeVersionTag(parsed.lastSeenVersion);
    }

    const cachedInfo = sanitizeCachedInfo(parsed.cachedInfo);

    return {
      lastCheck,
      dismissedVersion,
      cachedInfo,
    };
  } catch {
    return empty;
  }
}

function writeVersionCheckState(state: StoredVersionCheckState): void {
  try {
    localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify(state));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
}

function shouldCheckVersion(): boolean {
  const { lastCheck } = readVersionCheckState();
  if (!lastCheck || lastCheck <= 0) return true;
  const hoursSinceCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
  return hoursSinceCheck >= CHECK_INTERVAL_HOURS;
}

function saveVersionCheck(versionInfo: VersionInfo): void {
  const prev = readVersionCheckState();
  writeVersionCheckState({
    lastCheck: Date.now(),
    dismissedVersion: prev.dismissedVersion,
    cachedInfo: versionInfo,
  });
}

/**
 * Check if user dismissed this version (or a newer one)
 */
export function isVersionDismissed(version: string): boolean {
  const normalized = normalizeVersionTag(version);
  if (!normalized) return false;
  const { dismissedVersion } = readVersionCheckState();
  if (!dismissedVersion) return false;
  return compareVersions(dismissedVersion, normalized) >= 0;
}

/**
 * Mark version as dismissed while preserving cached info and lastCheck timestamp
 */
export function dismissVersion(version: string): void {
  const normalized = normalizeVersionTag(version);
  if (!normalized) return;
  const prev = readVersionCheckState();
  writeVersionCheckState({
    lastCheck: prev.lastCheck,
    dismissedVersion: normalized,
    cachedInfo: prev.cachedInfo,
  });
}

/**
 * Main update check entry point (strictly gated to Capacitor native platform)
 */
export async function checkForUpdates(
  options?: CheckForUpdatesOptions
): Promise<VersionInfo | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const rawCurrent = options?.currentVersionOverride ?? (await getInstalledAppVersion());
  const current = normalizeVersionTag(rawCurrent) || getCurrentVersion();

  if (!options?.force && !shouldCheckVersion()) {
    const { cachedInfo } = readVersionCheckState();
    if (!cachedInfo) return null;

    const hasUpdate = compareVersions(current, cachedInfo.latest) < 0;
    if (!hasUpdate) return null;

    if (options?.includeDismissed || !isVersionDismissed(cachedInfo.latest)) {
      return {
        ...cachedInfo,
        current,
        hasUpdate,
      };
    }

    return null;
  }

  const versionInfo = await fetchLatestVersion(current);
  if (!versionInfo) return null;

  saveVersionCheck(versionInfo);

  if (options?.force) {
    return versionInfo;
  }

  if (
    versionInfo.hasUpdate &&
    (options?.includeDismissed || !isVersionDismissed(versionInfo.latest))
  ) {
    return versionInfo;
  }

  return null;
}

/**
 * Format APK asset byte size into human-readable MB/KB label
 */
export function formatApkSize(bytes?: number | null): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) {
    return null;
  }
  if (bytes < 1024) {
    return `${Math.round(bytes)} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb >= 100 ? Math.round(kb) : Number(kb.toFixed(1))} KB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

/**
 * Open validated APK download URL (or trusted GitHub release fallback) via Capacitor Browser
 */
export async function downloadApkUpdate(
  info: VersionInfo
): Promise<{ started: boolean; usedFallbackReleasePage: boolean }> {
  const trustedApkUrl =
    info.apkDownloadUrl && isTrustedApkDownloadUrl(info.apkDownloadUrl)
      ? info.apkDownloadUrl
      : null;
  const trustedReleaseUrl = isTrustedGithubReleaseUrl(info.releaseUrl)
    ? info.releaseUrl
    : null;

  const targetUrl = trustedApkUrl ?? trustedReleaseUrl;
  const usedFallbackReleasePage = !trustedApkUrl && Boolean(trustedReleaseUrl);

  if (!targetUrl) {
    throw new Error('La URL de descarga de actualización no es confiable.');
  }

  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url: targetUrl });
    return { started: true, usedFallbackReleasePage };
  }

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
    return { started: true, usedFallbackReleasePage };
  }

  return { started: false, usedFallbackReleasePage };
}

/**
 * React hook helper preserved for backward compatibility
 */
export function useVersionCheck() {
  return {
    checkForUpdates,
    dismissVersion,
    compareVersions,
    getCurrentVersion,
    getInstalledAppVersion,
    downloadApkUpdate,
    formatApkSize,
  };
}
