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

export const MANIFEST_CANDIDATE_URLS = [
  'https://raw.githubusercontent.com/yashaswahuh/spirit/main/public/version.json',
  'https://raw.githubusercontent.com/yashaswahuh/spirit/phase-6/public/version.json',
  'https://yashaswahuh.is-a.dev/spirit/version.json',
  'https://raw.githubusercontent.com/yashaswahuh/spirit/main/dist/version.json',
];

export const UPDATE_MANIFEST_URL = MANIFEST_CANDIDATE_URLS[0];
export const FALLBACK_MANIFEST_URL = 'https://yashaswahuh.is-a.dev/spirit/version.json';

export interface VersionManifest {
  version: string;
  appVersion?: string;
  siteVersion?: string;
  build: number;
  bundleUrl: string;
  fallbackBundleUrl?: string;
  fallbackUrls?: string[];
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
 * Queries resilient raw GitHub CDN endpoints and fallback mirrors.
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
    let manifest: VersionManifest | null = null;
    let lastManifestError: any = null;

    for (const manifestUrl of MANIFEST_CANDIDATE_URLS) {
      try {
        manifest = await fetchManifestJson(manifestUrl);
        if (manifest && (manifest.siteVersion || manifest.version)) {
          break;
        }
      } catch (err: any) {
        lastManifestError = err;
        if (!options?.silent) {
          console.warn(`Manifest check failed for ${manifestUrl}:`, err?.message || err);
        }
      }
    }

    if (!manifest) {
      throw lastManifestError || new Error('Unable to reach update manifest across all endpoints');
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

    // Sanitize URLs to completely prevent HTTPS-to-HTTP redirects
    const sanitizeBundleUrl = (u: string): string => {
      let clean = u.trim();
      if (clean.includes('yashaswahuh.github.io/spirit')) {
        clean = clean.replace(
          'https://yashaswahuh.github.io/spirit',
          'https://raw.githubusercontent.com/yashaswahuh/spirit/main/public'
        ).replace(
          'http://yashaswahuh.github.io/spirit',
          'https://raw.githubusercontent.com/yashaswahuh/spirit/main/public'
        );
      }
      if (clean.startsWith('http://')) {
        clean = clean.replace(/^http:\/\//, 'https://');
      }
      return clean;
    };

    const bundleCandidates: string[] = [];
    if (manifest.bundleUrl) bundleCandidates.push(sanitizeBundleUrl(manifest.bundleUrl));
    if (manifest.fallbackBundleUrl) bundleCandidates.push(sanitizeBundleUrl(manifest.fallbackBundleUrl));
    if (Array.isArray(manifest.fallbackUrls)) {
      for (const u of manifest.fallbackUrls) {
        if (typeof u === 'string') bundleCandidates.push(sanitizeBundleUrl(u));
      }
    }
    bundleCandidates.push('https://raw.githubusercontent.com/yashaswahuh/spirit/main/public/dist-ota.zip');
    bundleCandidates.push('https://raw.githubusercontent.com/yashaswahuh/spirit/phase-6/public/dist-ota.zip');
    bundleCandidates.push('https://yashaswahuh.is-a.dev/spirit/dist-ota.zip');

    // Deduplicate and filter out any redirecting domains
    const uniqueCandidates = Array.from(new Set(bundleCandidates)).filter(
      u => u && !u.includes('github.io/spirit')
    );

    let downloaded: BundleInfo | null = null;
    let lastDownloadError: any = null;

    for (const bundleUrl of uniqueCandidates) {
      try {
        let checksum = manifest.checksum?.trim() || '';

        // If manifest doesn't supply a checksum, dynamically compute SHA-256 before download
        if (!checksum && typeof crypto !== 'undefined' && crypto.subtle) {
          try {
            const zipRes = await fetch(bundleUrl, { cache: 'no-store' });
            if (zipRes.ok) {
              const buf = await zipRes.arrayBuffer();
              const hashBuf = await crypto.subtle.digest('SHA-256', buf);
              checksum = Array.from(new Uint8Array(hashBuf))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            }
          } catch (calcErr) {
            console.warn('Checksum calculation failed:', calcErr);
          }
        }

        try {
          downloaded = await CapacitorUpdater.download({
            url: bundleUrl,
            version: remoteSiteVersion,
            ...(checksum ? { checksum } : {}),
          });
        } catch (downloadErr: any) {
          const errMsg = String(downloadErr?.message || downloadErr || '').toLowerCase();
          if (checksum && errMsg.includes('checksum')) {
            if (!options?.silent) {
              console.warn(`Checksum mismatch for ${bundleUrl}, retrying without checksum constraint...`);
            }
            downloaded = await CapacitorUpdater.download({
              url: bundleUrl,
              version: remoteSiteVersion,
            });
          } else {
            throw downloadErr;
          }
        }

        if (downloaded) {
          break;
        }
      } catch (err: any) {
        lastDownloadError = err;
        if (!options?.silent) {
          console.warn(`Bundle download failed from ${bundleUrl}:`, err?.message || err);
        }
      }
    }

    if (!downloaded) {
      throw lastDownloadError || new Error('Failed to download update bundle from all mirrors');
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

