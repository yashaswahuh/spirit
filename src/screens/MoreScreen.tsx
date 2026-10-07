import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles,
  Trash2,
  Sun,
  Moon,
  ShieldCheck,
  User,
  CheckSquare,
  HardDriveDownload,
  Smartphone,
  Calendar,
  Database,
  Download,
  CheckCircle2,
  Bell,
  Save,
} from 'lucide-react';
import { db } from '../db/dexie';
import { seedDemoData, hasDemoData, clearDemoData, resetDatabase } from '../db/repositories/setup.repo';
import { PageContainer } from '../components/layout/PageContainer';
import { TasksTrackerModal } from '../components/tasks/TasksTrackerModal';
import { BackupModal } from '../components/safety/BackupModal';
import { DeviceTransferModal } from '../components/safety/DeviceTransferModal';
import { DeleteDataModal } from '../components/safety/DeleteDataModal';
import { InstallGuidanceModal } from '../components/safety/InstallGuidanceModal';
import { PrivacyModal } from '../components/safety/PrivacyModal';
import {
  getLastBackupTimestamp,
  getChangesSinceBackup,
  checkPersistentStorage,
  requestPersistentStorage,
  getStorageEstimate,
  getBackupThresholds,
  setBackupThresholds,
  StorageEstimateInfo,
} from '../../src/utils/storage';

interface MoreScreenProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onResetApp: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  isDark,
  onToggleTheme,
  onResetApp,
}) => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  
  // Modals state
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Storage and Safety state
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);
  const [daysThreshold, setDaysThreshold] = useState<number>(7);
  const [changesThreshold, setChangesThreshold] = useState<number>(20);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  const lastBackupAt = getLastBackupTimestamp();
  const changesCount = getChangesSinceBackup();
  const isDemoMode = useLiveQuery(() => hasDemoData()) ?? false;

  useEffect(() => {
    checkPersistentStorage().then(setIsPersisted);
    getStorageEstimate().then(setStorageInfo);
    const thresholds = getBackupThresholds();
    setDaysThreshold(thresholds.daysThreshold);
    setChangesThreshold(thresholds.changesThreshold);
  }, []);

  const handleRequestPersistence = async () => {
    const granted = await requestPersistentStorage();
    setIsPersisted(granted);
    if (granted) {
      alert('Persistent storage granted! Your browser will protect Spirit data from eviction.');
    } else {
      alert('Persistent storage could not be enabled automatically. Installing Spirit as a PWA grants persistence.');
    }
    getStorageEstimate().then(setStorageInfo);
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setBackupThresholds(daysThreshold, changesThreshold);
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 2000);
  };

  const handleSeedDemo = async () => {
    if (confirm('Load demo semester data? This will add sample subjects and attendance logs tagged as demo data.')) {
      await seedDemoData();
    }
  };

  const handleClearDemo = async () => {
    if (confirm('Clear all demo data? This will remove sample subjects and demo attendance records.')) {
      await clearDemoData();
    }
  };

  const handleResetApp = async () => {
    if (confirm('RESET ENTIRE APP? This will permanently wipe all local database tables and restart onboarding.')) {
      await resetDatabase();
      onResetApp();
    }
  };

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in">
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Settings & Data
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Preferences, backup, and local storage management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Left Column: Profile & Preferences */}
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Info Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600" />
              Student Profile
            </h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800/80 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Name</span>
                <span className="font-bold text-gray-900 dark:text-white">{profile?.name || 'Student'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Program</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {program?.degree_type} • {program?.branch_department}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Semester</span>
                <span className="font-semibold text-gray-900 dark:text-white">{activeTerm?.name || 'Semester 1'}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Default Attendance Goal</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {profile?.default_attendance_threshold || 75}%
                </span>
              </div>
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Display Preferences
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">Theme Mode</span>
                <span className="text-xs text-gray-400">Switch between dark and light appearance</span>
              </div>
              <button
                onClick={onToggleTheme}
                className="p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
              </button>
            </div>
          </div>

          {/* Tasks & Deadlines Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
              Tasks & Exams Tracker
            </h3>
            <p className="text-xs text-gray-400">
              Manage assignments, quizzes, mid-sems, syllabus, exam venues, and countdowns.
            </p>
            <button
              onClick={() => setIsTasksOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-500 text-gray-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors min-h-[44px]"
            >
              Open Tasks & Exams Manager
            </button>
          </div>

          {/* Install Guidance Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              Install App & Offline Setup
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Add Spirit to your Home Screen to unlock persistent offline storage and protect attendance from iOS 7-day eviction.
            </p>
            <button
              onClick={() => setIsInstallOpen(true)}
              className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-600" />
                View Installation Guidance
              </span>
              <span className="text-xs text-gray-400">&rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Column: Backup, Storage & Privacy */}
        <div className="space-y-4 sm:space-y-6">
          {/* Backup & Restore Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDriveDownload className="w-3.5 h-3.5 text-indigo-600" />
                Backup & Restore
              </h3>
              {lastBackupAt ? (
                <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(lastBackupAt).toLocaleDateString()}
                </span>
              ) : (
                <span className="text-[11px] font-medium text-amber-500">
                  Not backed up
                </span>
              )}
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Export your full data to versioned JSON or CSV spreadsheets. Import anytime with merge or replace.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => setIsBackupOpen(true)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs sm:text-sm hover:bg-indigo-100/70 transition-colors min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <HardDriveDownload className="w-4 h-4" />
                  Backup & Restore (JSON / CSV)
                </span>
                <span className="text-xs font-normal text-indigo-500">Open &rarr;</span>
              </button>

              <button
                onClick={() => setIsTransferOpen(true)}
                className="w-full flex items-center justify-between py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Transfer to Another Device
                </span>
                <span className="text-xs text-gray-400">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Storage & Persistence Status Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Device Storage & Persistence
            </h3>

            {/* Persistence Status */}
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-bold text-gray-900 dark:text-white block">
                  Storage Status
                </span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {isPersisted
                    ? 'Persistent (protected from browser cache eviction)'
                    : 'Best-effort (may be cleared if device runs low on disk space)'}
                </span>
              </div>
              {isPersisted ? (
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1 shrink-0 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              ) : (
                <button
                  onClick={handleRequestPersistence}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shrink-0 text-xs shadow-xs min-h-[36px]"
                >
                  Enable
                </button>
              )}
            </div>

            {/* Storage Quota Usage */}
            {storageInfo && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">IndexedDB Usage</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {storageInfo.usageFormatted} of {storageInfo.quotaFormatted}
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${Math.max(1, storageInfo.percentUsed)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Backup Reminder Thresholds */}
            <form onSubmit={handleSaveThresholds} className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-amber-500" />
                  Backup Reminder Rules
                </span>
                <span className="text-[10px] text-gray-400">
                  {changesCount} unbacked edits
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                    Days without backup
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={daysThreshold}
                    onChange={(e) => setDaysThreshold(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 block mb-1">
                    Edits without backup
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={changesThreshold}
                    onChange={(e) => setChangesThreshold(parseInt(e.target.value, 10) || 1)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5 min-h-[38px]"
              >
                {thresholdSaved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Reminder Rules Saved
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-gray-500" />
                    Save Reminder Rules
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Database Tools & Danger Zone */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Data Tools
            </h3>
            <div className="space-y-2.5">
              {isDemoMode ? (
                <button
                  onClick={handleClearDemo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 font-semibold text-xs sm:text-sm hover:bg-amber-100/60 dark:hover:bg-amber-900/50 transition-colors min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Clear Demo Data (Keep Real Data)
                </button>
              ) : (
                <button
                  onClick={handleSeedDemo}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
                >
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Load Sample Demo Semester Data
                </button>
              )}
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold text-xs sm:text-sm hover:bg-red-100/60 transition-colors min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                Delete All My Data (Typed Confirm)
              </button>
              <button
                onClick={handleResetApp}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Reset App & Restart Setup
              </button>
            </div>
          </div>

          {/* Local-First Privacy Notice (Clickable to open PrivacyModal) */}
          <div
            onClick={() => setIsPrivacyOpen(true)}
            className="bg-gray-100/70 dark:bg-gray-800/40 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors cursor-pointer rounded-3xl p-5 sm:p-6 text-center space-y-2 group"
          >
            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              100% Local-First & Private
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              All records are stored securely in your browser's IndexedDB. Zero accounts, no tracking, and no external network calls.
            </p>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 inline-block pt-1 group-hover:underline">
              Read Plain-Language Privacy Policy &rarr;
            </span>
          </div>
        </div>
      </div>

      {isTasksOpen && (
        <TasksTrackerModal
          isOpen={isTasksOpen}
          onClose={() => setIsTasksOpen(false)}
          courses={courses}
        />
      )}

      {isBackupOpen && (
        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />
      )}

      {isTransferOpen && (
        <DeviceTransferModal
          isOpen={isTransferOpen}
          onClose={() => setIsTransferOpen(false)}
        />
      )}

      {isDeleteOpen && (
        <DeleteDataModal
          isOpen={isDeleteOpen}
          onClose={() => setIsDeleteOpen(false)}
          onDeleted={onResetApp}
        />
      )}

      {isInstallOpen && (
        <InstallGuidanceModal
          isOpen={isInstallOpen}
          onClose={() => setIsInstallOpen(false)}
        />
      )}

      {isPrivacyOpen && (
        <PrivacyModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
          onOpenBackup={() => setIsBackupOpen(true)}
        />
      )}
    </PageContainer>
  );
};
