/**
 * Version Detection & Update Notification System
 * Checks GitHub releases/tags for newer versions and shows non-intrusive notification
 */

export interface VersionInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  releaseUrl: string;
  releaseNotes?: string;
  publishedAt?: string;
  isPreRelease: boolean;
}

const GITHUB_REPO = 'migol-dev/finance-pal'; // Cambia a tu repo
const VERSION_CHECK_KEY = 'finance-pal-version-check';
const CHECK_INTERVAL_HOURS = 6; // Check every 6 hours

/**
 * Get current app version from package.json or fallback
 */
export function getCurrentVersion(): string {
  // Try to get from import.meta.env (set at build time)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  // Fallback to hardcoded or localStorage
  return '1.17.8';
}

/**
 * Fetch latest release from GitHub API
 */
export async function fetchLatestVersion(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      // Try tags if no releases
      return await fetchLatestTag();
    }

    const release = await response.json();
    
    return {
      current: getCurrentVersion(),
      latest: release.tag_name.replace(/^v/, ''),
      hasUpdate: compareVersions(getCurrentVersion(), release.tag_name.replace(/^v/, '')) < 0,
      releaseUrl: release.html_url,
      releaseNotes: release.body,
      publishedAt: release.published_at,
      isPreRelease: release.prerelease,
    };
  } catch (error) {
    console.warn('Version check failed:', error);
    return null;
  }
}

/**
 * Fallback: fetch latest tag
 */
async function fetchLatestTag(): Promise<VersionInfo | null> {
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/tags`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });
    
    if (!response.ok) return null;
    
    const tags = await response.json();
    if (!tags.length) return null;
    
    const latestTag = tags[0].name.replace(/^v/, '');
    
    return {
      current: getCurrentVersion(),
      latest: latestTag,
      hasUpdate: compareVersions(getCurrentVersion(), latestTag) < 0,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases/tag/${tags[0].name}`,
      isPreRelease: false,
    };
  } catch {
    return null;
  }
}

/**
 * Compare semantic versions (returns -1 if a < b, 0 if equal, 1 if a > b)
 */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

/**
 * Check if we should perform version check (rate limiting)
 */
function shouldCheckVersion(): boolean {
  try {
    const stored = localStorage.getItem(VERSION_CHECK_KEY);
    if (!stored) return true;
    
    const { lastCheck } = JSON.parse(stored);
    const hoursSinceCheck = (Date.now() - lastCheck) / (1000 * 60 * 60);
    return hoursSinceCheck >= CHECK_INTERVAL_HOURS;
  } catch {
    return true;
  }
}

/**
 * Save version check timestamp
 */
function saveVersionCheck(versionInfo: VersionInfo): void {
  try {
    localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify({
      lastCheck: Date.now(),
      lastSeenVersion: versionInfo.latest,
      dismissed: false,
    }));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Check if user dismissed this version
 */
function isVersionDismissed(version: string): boolean {
  try {
    const stored = localStorage.getItem(VERSION_CHECK_KEY);
    if (!stored) return false;
    const { lastSeenVersion, dismissed } = JSON.parse(stored);
    return dismissed && lastSeenVersion === version;
  } catch {
    return false;
  }
}

/**
 * Mark version as dismissed
 */
export function dismissVersion(version: string): void {
  try {
    localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify({
      lastCheck: Date.now(),
      lastSeenVersion: version,
      dismissed: true,
    }));
  } catch {
    // Ignore localStorage errors (private browsing, quota exceeded, etc.)
  }
}

/**
 * Main function: check for updates and return info if available
 * Call this on app startup (e.g., in App.tsx useEffect)
 */
export async function checkForUpdates(): Promise<VersionInfo | null> {
  // Skip if not enough time passed
  if (!shouldCheckVersion()) return null;
  
  const versionInfo = await fetchLatestVersion();
  if (!versionInfo) return null;
  
  saveVersionCheck(versionInfo);
  
  // Only return if there's an update AND user hasn't dismissed it
  if (versionInfo.hasUpdate && !isVersionDismissed(versionInfo.latest)) {
    return versionInfo;
  }
  
  return null;
}

/**
 * React hook for version checking (optional - for components)
 */
export function useVersionCheck() {
  // This would be used in a component with useEffect
  // Implementation left for component integration
  return { checkForUpdates, dismissVersion, compareVersions };
}

export { GITHUB_REPO };