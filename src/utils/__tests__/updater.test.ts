import { describe, it, expect } from 'vitest';
import {
  CURRENT_APP_VERSION,
  CURRENT_BUILD_NUMBER,
  checkForLiveUpdate,
  isUpdatePendingRestart,
} from '../updater';

describe('Live OTA Updater Engine', () => {
  it('exports correct v1.0.1 metadata and initial pending status', () => {
    expect(CURRENT_APP_VERSION).toBe('1.0.1');
    expect(CURRENT_BUILD_NUMBER).toBe(1001);
    expect(isUpdatePendingRestart()).toBe(false);
  });

  it('safely handles non-native / node environment without throwing', async () => {
    const res = await checkForLiveUpdate({ silent: true });
    expect(res.hasUpdate).toBe(false);
    expect(res.currentVersion).toBe('1.0.1');
  });
});

