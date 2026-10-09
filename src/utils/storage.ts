/**
 * Storage Safety & Persistence Engine
 * Manages persistent storage requests (navigator.storage.persist),
 * storage quota estimation (navigator.storage.estimate),
 * backup tracking, and backup reminder thresholds.
 */

const STORAGE_KEYS = {
  LAST_BACKUP: 'spirit_last_backup_at',
  CHANGES_SINCE_BACKUP: 'spirit_changes_since_backup',
  DISMISSED_AT: 'spirit_backup_reminder_dismissed_at',
  DAYS_THRESHOLD: 'spirit_backup_days_threshold',
  CHANGES_THRESHOLD: 'spirit_backup_changes_threshold',
};

export const DEFAULT_BACKUP_DAYS_THRESHOLD = 7;
export const DEFAULT_BACKUP_CHANGES_THRESHOLD = 20;

import { formatDate } from './preferences';

/**
 * Checks if the browser has granted persistent storage to this origin.
 */
export async function checkPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persisted === 'function'
  ) {
    try {
      return await navigator.storage.persisted();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Requests persistent storage from the browser.
 * Returns true if granted, false if denied or unsupported.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.persist === 'function'
  ) {
    try {
      return await navigator.storage.persist();
    } catch {
      return false;
    }
  }
  return false;
}

export interface StorageEstimateInfo {
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  percentUsed: number;
}

/**
 * Formats byte values to human-readable strings (KB, MB, GB).
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i] || 'MB'}`;
}

/**
 * Estimates storage usage and total quota.
 */
export async function getStorageEstimate(): Promise<StorageEstimateInfo | null> {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    typeof navigator.storage.estimate === 'function'
  ) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageBytes = estimate.usage || 0;
      const quotaBytes = estimate.quota || 0;
      const percentUsed = quotaBytes > 0 ? (usageBytes / quotaBytes) * 100 : 0;
      return {
        usageBytes,
        quotaBytes,
        usageFormatted: formatBytes(usageBytes),
        quotaFormatted: formatBytes(quotaBytes),
        percentUsed: Math.min(100, Math.round(percentUsed * 10) / 10),
      };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Records that a backup has been exported or imported.
 */
export function recordBackupExported(timestamp = new Date().toISOString()): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
    localStorage.setItem(STORAGE_KEYS.CHANGES_SINCE_BACKUP, '0');
    localStorage.removeItem(STORAGE_KEYS.DISMISSED_AT);
  } catch {
    // Ignore localStorage errors (e.g. private mode quota)
  }
}

/**
 * Increments the local counter of data changes since the last backup.
 */
export function recordDataChange(count = 1): void {
  try {
    const current = getChangesSinceBackup();
    localStorage.setItem(STORAGE_KEYS.CHANGES_SINCE_BACKUP, String(current + count));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Returns the ISO timestamp of the last successful backup, or null.
 */
export function getLastBackupTimestamp(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_BACKUP);
  } catch {
    return null;
  }
}

/**
 * Returns the count of changes since the last backup.
 */
export function getChangesSinceBackup(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHANGES_SINCE_BACKUP);
    const parsed = raw ? parseInt(raw, 10) : 0;
    return isNaN(parsed) ? 0 : parsed;
  } catch {
    return 0;
  }
}

/**
 * Retrieves the configurable backup reminder thresholds.
 */
export function getBackupThresholds(): { daysThreshold: number; changesThreshold: number } {
  try {
    const daysRaw = localStorage.getItem(STORAGE_KEYS.DAYS_THRESHOLD);
    const changesRaw = localStorage.getItem(STORAGE_KEYS.CHANGES_THRESHOLD);
    const days = daysRaw ? parseInt(daysRaw, 10) : DEFAULT_BACKUP_DAYS_THRESHOLD;
    const changes = changesRaw ? parseInt(changesRaw, 10) : DEFAULT_BACKUP_CHANGES_THRESHOLD;
    return {
      daysThreshold: isNaN(days) ? DEFAULT_BACKUP_DAYS_THRESHOLD : days,
      changesThreshold: isNaN(changes) ? DEFAULT_BACKUP_CHANGES_THRESHOLD : changes,
    };
  } catch {
    return {
      daysThreshold: DEFAULT_BACKUP_DAYS_THRESHOLD,
      changesThreshold: DEFAULT_BACKUP_CHANGES_THRESHOLD,
    };
  }
}

/**
 * Sets the configurable backup reminder thresholds.
 */
export function setBackupThresholds(days: number, changes: number): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DAYS_THRESHOLD, String(Math.max(1, days)));
    localStorage.setItem(STORAGE_KEYS.CHANGES_THRESHOLD, String(Math.max(1, changes)));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Temporarily dismisses the backup reminder banner for 24 hours.
 */
export function dismissBackupReminder(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DISMISSED_AT, new Date().toISOString());
  } catch {
    // Ignore localStorage errors
  }
}

export interface BackupReminderStatus {
  shouldShow: boolean;
  reason?: 'days' | 'changes' | 'never_backed_up';
  daysSince?: number;
  changesCount: number;
  lastBackupFormatted?: string;
}

/**
 * Determines whether the backup reminder banner should be presented.
 * Pure logic function that can also accept simulated parameters for testing.
 */
export function evaluateBackupReminder(params: {
  lastBackupAt: string | null;
  changesCount: number;
  dismissedAt: string | null;
  now: Date;
  daysThreshold: number;
  changesThreshold: number;
}): BackupReminderStatus {
  const { lastBackupAt, changesCount, dismissedAt, now, daysThreshold, changesThreshold } = params;

  // Check if dismissed within the last 24 hours
  if (dismissedAt) {
    const dismissedTime = new Date(dismissedAt).getTime();
    const hoursSinceDismissed = (now.getTime() - dismissedTime) / (1000 * 60 * 60);
    if (!isNaN(hoursSinceDismissed) && hoursSinceDismissed < 24) {
      return { shouldShow: false, changesCount };
    }
  }

  // If never backed up, trigger if changes reach 5 or threshold
  if (!lastBackupAt) {
    if (changesCount >= Math.min(5, changesThreshold)) {
      return {
        shouldShow: true,
        reason: 'never_backed_up',
        changesCount,
      };
    }
    return { shouldShow: false, changesCount };
  }

  // Calculate days since last backup
  const lastBackupTime = new Date(lastBackupAt).getTime();
  if (isNaN(lastBackupTime)) {
    return { shouldShow: false, changesCount };
  }

  const daysSince = Math.floor((now.getTime() - lastBackupTime) / (1000 * 60 * 60 * 24));

  if (daysSince >= daysThreshold) {
    return {
      shouldShow: true,
      reason: 'days',
      daysSince,
      changesCount,
      lastBackupFormatted: formatDate(lastBackupTime),
    };
  }

  if (changesCount >= changesThreshold) {
    return {
      shouldShow: true,
      reason: 'changes',
      daysSince,
      changesCount,
      lastBackupFormatted: formatDate(lastBackupTime),
    };
  }

  return { shouldShow: false, daysSince, changesCount };
}

/**
 * Checks current environment state to decide if backup reminder should show.
 */
export function checkBackupReminder(): BackupReminderStatus {
  const lastBackupAt = getLastBackupTimestamp();
  const changesCount = getChangesSinceBackup();
  let dismissedAt: string | null = null;
  try {
    dismissedAt = localStorage.getItem(STORAGE_KEYS.DISMISSED_AT);
  } catch {
    // Ignore
  }
  const { daysThreshold, changesThreshold } = getBackupThresholds();

  return evaluateBackupReminder({
    lastBackupAt,
    changesCount,
    dismissedAt,
    now: new Date(),
    daysThreshold,
    changesThreshold,
  });
}

/**
 * Clears all local storage safety tracking data (used upon 'Delete All My Data').
 */
export function clearStorageSafetyData(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore
  }
}
