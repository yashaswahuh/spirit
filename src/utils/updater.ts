import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { CapacitorUpdater, type BundleInfo } from '@capgo/capacitor-updater';
import {
  CURRENT_APP_VERSION,
  CURRENT_SITE_VERSION,
  CURRENT_BUILD_NUMBER,
} from '../version';

export {
  CURRENT_APP_VERSION,
  CURRENT_SITE_VERSION,
  CURRENT_BUILD_NUMBER,
};

export const UPDATE_MANIFEST_URL = 'https://yashaswahuh.is-a.dev/spirit/version.json';
export const FALLBACK_MANIFEST_URL = 'https://yashaswahuh.github.io/spirit/version.json';

export interface VersionManifest {
  version: string;
  appVersion?: string;
  siteVersion?: string;
  build: number;
  bundleUrl: string;
  fallbackBundleUrl?: string;
  checksum?: string;
  releaseNotes?: string;
  minNativeVersion?: string;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentAppVersion: string;
  currentSiteVersion: string;
  latestSiteVersion: string;
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
    try {
      const res = await CapacitorHttp.get({
        url: cacheBustedUrl,
        headers: {
          Accept: 'application/json',
        },
      });
      if (res.status === 200 && res.data) {
        return typeof res.data === 'string' ? JSON.parse(res.data) : (res.data as VersionManifest);
      }
    } catch (nativeErr) {
      console.warn('CapacitorHttp get failed, falling back to window.fetch:', nativeErr);
    }
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
      currentAppVersion: CURRENT_APP_VERSION,
      currentSiteVersion: CURRENT_SITE_VERSION,
      latestSiteVersion: CURRENT_SITE_VERSION,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_SITE_VERSION,
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

    // Check if remote site version is newer or has a higher build number
    const remoteSiteVersion = manifest.siteVersion || manifest.version;
    const isNewer =
      manifest.build > CURRENT_BUILD_NUMBER ||
      (remoteSiteVersion !== CURRENT_SITE_VERSION && compareSemver(remoteSiteVersion, CURRENT_SITE_VERSION) > 0);

    if (!isNewer || !manifest.bundleUrl) {
      return {
        hasUpdate: false,
        currentAppVersion: CURRENT_APP_VERSION,
        currentSiteVersion: CURRENT_SITE_VERSION,
        latestSiteVersion: remoteSiteVersion || CURRENT_SITE_VERSION,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: remoteSiteVersion || CURRENT_SITE_VERSION,
      };
    }

    // Download the new web bundle in the background with automatic dual-domain fallback
    let downloaded: BundleInfo;
    try {
      downloaded = await CapacitorUpdater.download({
        url: manifest.bundleUrl,
        version: remoteSiteVersion,
        checksum: manifest.checksum,
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
          version: remoteSiteVersion,
          checksum: manifest.checksum,
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
      currentAppVersion: CURRENT_APP_VERSION,
      currentSiteVersion: CURRENT_SITE_VERSION,
      latestSiteVersion: remoteSiteVersion,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: remoteSiteVersion,
      downloadedBundle: downloaded,
    };
  } catch (err: any) {
    if (!options?.silent) {
      console.error('Live update check failed:', err);
    }
    return {
      hasUpdate: false,
      currentAppVersion: CURRENT_APP_VERSION,
      currentSiteVersion: CURRENT_SITE_VERSION,
      latestSiteVersion: CURRENT_SITE_VERSION,
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

