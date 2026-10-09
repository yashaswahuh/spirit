import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo } from '@capgo/capacitor-updater';

export const CURRENT_APP_VERSION = '1.0.0';
export const CURRENT_BUILD_NUMBER = 1000;

export const UPDATE_MANIFEST_URL = 'https://yashaswahuh.is-a.dev/spirit/version.json';
export const FALLBACK_MANIFEST_URL = 'https://yashaswahuh.github.io/spirit/version.json';

export interface VersionManifest {
  version: string;
  build: number;
  bundleUrl: string;
  fallbackBundleUrl?: string;
  releaseNotes?: string;
  minNativeVersion?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  downloadedBundle?: BundleInfo;
  error?: string;
}

// In-memory tracking of downloaded bundle ready for reload
let pendingBundle: BundleInfo | null = null;

/**
 * Fetches version manifest JSON safely:
 * - On native platforms (Android): Uses CapacitorHttp to bypass WebView CORS and preflight restrictions entirely.
 * - On web platforms: Uses standard fetch with simple CORS-safelisted headers (Accept: application/json)
 *   so GitHub Pages doesn't reject with 405 Method Not Allowed on OPTIONS preflights.
 */
async function fetchManifestJson(url: string): Promise<VersionManifest> {
  const cacheBustedUrl = `${url}?_t=${Date.now()}`;

  if (Capacitor.isNativePlatform()) {
    const res = await CapacitorHttp.get({
      url: cacheBustedUrl,
      headers: {
        Accept: 'application/json',
      },
    });
    if (res.status !== 200 || !res.data) {
      throw new Error(`HTTP status: ${res.status}`);
    }
    return typeof res.data === 'string' ? JSON.parse(res.data) : (res.data as VersionManifest);
  }

  const res = await fetch(cacheBustedUrl, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP status: ${res.status}`);
  }
  return await res.json();
}

/**
 * Initializes OTA Updater on application startup.
 * Confirms JavaScript execution with native layer to prevent rollback,
 * and schedules a background check for newer web releases.
 */
export async function initAppUpdater(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. MUST be called on startup to signal successful bundle boot
    await CapacitorUpdater.notifyAppReady();

    // 2. Schedule a non-blocking background check 4 seconds after launch
    setTimeout(() => {
      checkForLiveUpdate({ silent: true }).catch((err) => {
        console.warn('Background OTA update check failed silently:', err);
      });
    }, 4000);
  } catch (err) {
    console.error('Failed to initialize CapacitorUpdater:', err);
  }
}

/**
 * Checks for an updated version manifest and downloads the bundle.
 * Tries the custom domain https://yashaswahuh.is-a.dev/spirit/ first,
 * falling back to GitHub Pages if needed.
 */
export async function checkForLiveUpdate(options?: {
  silent?: boolean;
}): Promise<UpdateCheckResult> {
  if (!Capacitor.isNativePlatform()) {
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
    };
  }

  try {
    let manifest: VersionManifest;
    try {
      manifest = await fetchManifestJson(UPDATE_MANIFEST_URL);
    } catch (primaryErr) {
      if (!options?.silent) {
        console.warn('Primary manifest check failed, trying fallback:', primaryErr);
      }
      manifest = await fetchManifestJson(FALLBACK_MANIFEST_URL);
    }

    // Check if remote version is newer or has a higher build number
    const isNewer =
      manifest.build > CURRENT_BUILD_NUMBER ||
      (manifest.version !== CURRENT_APP_VERSION && compareSemver(manifest.version, CURRENT_APP_VERSION) > 0);

    if (!isNewer || !manifest.bundleUrl) {
      return {
        hasUpdate: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: manifest.version || CURRENT_APP_VERSION,
      };
    }

    // Download the new web bundle in the background with automatic dual-domain fallback
    let downloaded: BundleInfo;
    try {
      downloaded = await CapacitorUpdater.download({
        url: manifest.bundleUrl,
        version: manifest.version,
      });
    } catch (primaryErr) {
      const fallbackUrl =
        manifest.fallbackBundleUrl ||
        manifest.bundleUrl.replace('yashaswahuh.is-a.dev', 'yashaswahuh.github.io');
      if (fallbackUrl && fallbackUrl !== manifest.bundleUrl) {
        if (!options?.silent) {
          console.warn('Primary bundle download failed, falling back to backup domain:', fallbackUrl, primaryErr);
        }
        downloaded = await CapacitorUpdater.download({
          url: fallbackUrl,
          version: manifest.version,
        });
      } else {
        throw primaryErr;
      }
    }

    // Mark the bundle to be activated on the next background / app restart
    await CapacitorUpdater.next({ id: downloaded.id });
    pendingBundle = downloaded;

    return {
      hasUpdate: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: manifest.version,
      downloadedBundle: downloaded,
    };
  } catch (err: any) {
    if (!options?.silent) {
      console.error('Live update check failed:', err);
    }
    return {
      hasUpdate: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      error: err?.message || 'Network error while checking updates',
    };
  }
}

/**
 * Immediately restarts the app to apply the newly downloaded bundle.
 */
export async function applyUpdateNow(): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    window.location.reload();
    return;
  }

  try {
    if (pendingBundle) {
      await CapacitorUpdater.set({ id: pendingBundle.id });
    } else {
      await CapacitorUpdater.reload();
    }
  } catch (err) {
    console.error('Failed to reload bundle immediately:', err);
    await CapacitorUpdater.reload();
  }
}

/**
 * Returns whether a downloaded update is waiting for application restart.
 */
export function isUpdatePendingRestart(): boolean {
  return pendingBundle !== null;
}

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(n => parseInt(n, 10) || 0);
  const pb = b.split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

