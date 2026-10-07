import React, { useState } from 'react';
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
} from 'lucide-react';
import { db } from '../db/dexie';
import { seedDemoData } from '../db/repositories/setup.repo';
import { PageContainer } from '../components/layout/PageContainer';
import { TasksTrackerModal } from '../components/tasks/TasksTrackerModal';
import { BackupModal } from '../components/safety/BackupModal';
import { DeviceTransferModal } from '../components/safety/DeviceTransferModal';
import { DeleteDataModal } from '../components/safety/DeleteDataModal';
import { getLastBackupTimestamp } from '../utils/storage';

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

  const lastBackupAt = getLastBackupTimestamp();

  const handleSeedDemo = async () => {
    if (confirm('Load demo semester data? This will add sample subjects and attendance logs.')) {
      await seedDemoData();
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

          {/* Database Tools & Danger Zone */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Data Tools
            </h3>
            <div className="space-y-2.5">
              <button
                onClick={handleSeedDemo}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Load Sample Demo Semester Data
              </button>
              <button
                onClick={() => setIsDeleteOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-semibold text-xs sm:text-sm hover:bg-red-100/60 transition-colors min-h-[44px]"
              >
                <Trash2 className="w-4 h-4" />
                Delete All My Data
              </button>
            </div>
          </div>

          {/* Local-First Privacy Notice */}
          <div className="bg-gray-100/70 dark:bg-gray-800/40 rounded-3xl p-5 sm:p-6 text-center space-y-2">
            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              100% Local-First & Private
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              All records are stored securely in your browser's IndexedDB. Zero accounts, no tracking, and no external network calls.
            </p>
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
    </PageContainer>
  );
};
