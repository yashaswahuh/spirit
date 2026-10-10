import { describe, it, expect } from 'vitest';
import {
  CURRENT_APP_VERSION,
  CURRENT_SITE_VERSION,
  CURRENT_BUILD_NUMBER,
  checkForLiveUpdate,
  isUpdatePendingRestart,
} from '../updater';

describe('Live OTA Updater Engine', () => {
  it('exports correct app version v1.0.1 and site version v1.0.4', () => {
    expect(CURRENT_APP_VERSION).toBe('1.0.1');
    expect(CURRENT_SITE_VERSION).toBe('1.0.4');
    expect(CURRENT_BUILD_NUMBER).toBe(1004);
    expect(isUpdatePendingRestart()).toBe(false);
  });

  it('safely handles non-native / node environment without throwing', async () => {
    const res = await checkForLiveUpdate({ silent: true });
    expect(res.hasUpdate).toBe(false);
    expect(res.currentAppVersion).toBe('1.0.1');
    expect(res.currentSiteVersion).toBe('1.0.4');
    expect(res.currentVersion).toBe('1.0.1');
    expect(res.latestVersion).toBe('1.0.4');
  });
});

