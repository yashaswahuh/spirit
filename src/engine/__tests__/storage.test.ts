import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  evaluateBackupReminder,
} from '../../utils/storage';

describe('Storage & Safety Engine', () => {
  describe('formatBytes', () => {
    it('formats 0 bytes as 0 KB', () => {
      expect(formatBytes(0)).toBe('0 KB');
    });

    it('formats kilobytes correctly', () => {
      expect(formatBytes(1024)).toBe('1.0 KB');
      expect(formatBytes(2048)).toBe('2.0 KB');
    });

    it('formats megabytes correctly', () => {
      expect(formatBytes(1048576)).toBe('1.0 MB');
      expect(formatBytes(5242880)).toBe('5.0 MB');
    });

    it('formats gigabytes correctly', () => {
      expect(formatBytes(1073741824)).toBe('1.0 GB');
    });
  });

  describe('evaluateBackupReminder', () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');
    const defaultDaysThreshold = 7;
    const defaultChangesThreshold = 20;

    it('returns shouldShow: false when reminder was dismissed within last 24 hours', () => {
      const dismissedAt = new Date('2026-10-10T02:00:00.000Z').toISOString(); // 10 hours ago
      const status = evaluateBackupReminder({
        lastBackupAt: '2026-09-01T00:00:00.000Z', // 40 days ago
        changesCount: 50,
        dismissedAt,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(false);
    });

    it('allows reminder when dismiss was over 24 hours ago', () => {
      const dismissedAt = new Date('2026-10-08T00:00:00.000Z').toISOString(); // 60 hours ago
      const status = evaluateBackupReminder({
        lastBackupAt: '2026-09-01T00:00:00.000Z', // 40 days ago
        changesCount: 5,
        dismissedAt,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(true);
      expect(status.reason).toBe('days');
    });

    it('triggers reminder when never backed up and changes reach 5 or threshold', () => {
      const status = evaluateBackupReminder({
        lastBackupAt: null,
        changesCount: 6,
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(true);
      expect(status.reason).toBe('never_backed_up');
    });

    it('does not trigger reminder when never backed up but changes are under 5', () => {
      const status = evaluateBackupReminder({
        lastBackupAt: null,
        changesCount: 3,
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(false);
    });

    it('triggers reminder when days threshold is exceeded', () => {
      const lastBackupAt = new Date('2026-10-01T12:00:00.000Z').toISOString(); // 9 days ago
      const status = evaluateBackupReminder({
        lastBackupAt,
        changesCount: 2,
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(true);
      expect(status.reason).toBe('days');
      expect(status.daysSince).toBe(9);
    });

    it('triggers reminder when changes threshold is exceeded even within days threshold', () => {
      const lastBackupAt = new Date('2026-10-09T12:00:00.000Z').toISOString(); // 1 day ago
      const status = evaluateBackupReminder({
        lastBackupAt,
        changesCount: 25, // threshold is 20
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(true);
      expect(status.reason).toBe('changes');
      expect(status.changesCount).toBe(25);
    });

    it('does not trigger reminder when backed up recently and changes are low', () => {
      const lastBackupAt = new Date('2026-10-08T12:00:00.000Z').toISOString(); // 2 days ago
      const status = evaluateBackupReminder({
        lastBackupAt,
        changesCount: 4,
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(false);
    });

    it('safely handles corrupted or invalid timestamp strings', () => {
      const status = evaluateBackupReminder({
        lastBackupAt: 'malformed-timestamp',
        changesCount: 4,
        dismissedAt: null,
        now: fixedNow,
        daysThreshold: defaultDaysThreshold,
        changesThreshold: defaultChangesThreshold,
      });

      expect(status.shouldShow).toBe(false);
    });
  });
});
