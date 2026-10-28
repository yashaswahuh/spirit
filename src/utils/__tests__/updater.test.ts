import { describe, it, expect } from 'vitest';
import {
  CURRENT_APP_VERSION,
  CURRENT_SITE_VERSION,
  CURRENT_BUILD_NUMBER,
  checkForLiveUpdate,
  isUpdatePendingRestart,
} from '../updater';
import pkg from '../../../package.json';

describe('Live OTA Updater Engine', () => {
  it('exports matching version information in sync with package.json', () => {
    expect(CURRENT_APP_VERSION).toBe(pkg.version);
    expect(CURRENT_SITE_VERSION).toBe(pkg.siteVersion);
    expect(CURRENT_BUILD_NUMBER).toBe(pkg.build);
    expect(isUpdatePendingRestart()).toBe(false);
  });

  it('safely handles non-native / node environment without throwing', async () => {
    const res = await checkForLiveUpdate({ silent: true });
    expect(res.hasUpdate).toBe(false);
    expect(res.currentAppVersion).toBe(CURRENT_APP_VERSION);
    expect(res.currentSiteVersion).toBe(CURRENT_SITE_VERSION);
    expect(res.currentVersion).toBe(CURRENT_APP_VERSION);
    expect(res.latestVersion).toBe(CURRENT_SITE_VERSION);
  });
});
