import React, { useState, useEffect } from 'react';
import { HardDriveDownload, X, AlertCircle } from 'lucide-react';
import {
  checkBackupReminder,
  dismissBackupReminder,
  BackupReminderStatus,
} from '../../utils/storage';

interface BackupReminderBannerProps {
  onOpenBackup: () => void;
  className?: string;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  onOpenBackup,
  className = '',
}) => {
  const [reminder, setReminder] = useState<BackupReminderStatus | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const status = checkBackupReminder();
    setReminder(status);
  }, []);

  if (isDismissed || !reminder || !reminder.shouldShow) {
    return null;
  }

  const handleDismiss = () => {
    dismissBackupReminder();
    setIsDismissed(true);
  };

  const getMessage = () => {
    if (reminder.reason === 'never_backed_up') {
      return `You have logged ${reminder.changesCount} updates without a backup. Export a quick backup to protect your data!`;
    }
    if (reminder.reason === 'days') {
      return `It's been ${reminder.daysSince} days since your last backup (${reminder.lastBackupFormatted}). Keep your semester data safe!`;
    }
    if (reminder.reason === 'changes') {
      return `You've made ${reminder.changesCount} edits since your last backup. Back up now to prevent accidental loss.`;
    }
    return 'Regular backups protect your attendance from accidental browser clearing.';
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 border border-amber-200/80 dark:border-amber-900/60 shadow-xs flex items-center justify-between gap-3 animate-fade-in ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 block truncate">
            Backup Recommended
          </span>
          <p className="text-[11px] sm:text-xs text-amber-800/90 dark:text-amber-300/90 leading-tight">
            {getMessage()}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenBackup}
          className="inline-flex items-center gap-1.5 py-1.5 sm:py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs min-h-[36px]"
        >
          <HardDriveDownload className="w-3.5 h-3.5" />
          <span className="hidden xs:inline">Back Up</span> Now
        </button>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-amber-700 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
          title="Dismiss reminder for 24 hours"
          aria-label="Dismiss reminder"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
