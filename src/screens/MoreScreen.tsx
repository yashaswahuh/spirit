import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sparkles, Trash2, Sun, Moon, ShieldCheck } from 'lucide-react';
import { db } from '../db/dexie';
import { seedDemoData, resetDatabase } from '../db/repositories/setup.repo';

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

  const handleSeedDemo = async () => {
    if (confirm('Load demo semester data? This will add sample subjects and attendance logs.')) {
      await seedDemoData();
    }
  };

  const handleResetData = async () => {
    if (confirm('Are you sure you want to delete ALL local data? This action cannot be undone.')) {
      await resetDatabase();
      onResetApp();
    }
  };

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Settings & More
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Preferences, backup, and local storage
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Student Profile
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Name</span>
          <span className="font-bold text-gray-900 dark:text-white">{profile?.name || 'Student'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Program</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {program?.degree_type} • {program?.branch_department}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Semester</span>
          <span className="font-semibold text-gray-900 dark:text-white">{activeTerm?.name || 'Semester 1'}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Default Attendance Goal</span>
          <span className="font-bold text-indigo-600 dark:text-indigo-400">
            {profile?.default_attendance_threshold || 75}%
          </span>
        </div>
      </div>

      {/* Preferences Card */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Preferences
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">Dark Mode</span>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>
      </div>

      {/* Data Management Card */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Database & Demo Tools
        </h3>
        <button
          onClick={handleSeedDemo}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-semibold text-xs hover:bg-indigo-100 transition-colors min-h-[44px]"
        >
          <Sparkles className="w-4 h-4" />
          Load Sample Demo Semester Data
        </button>
        <button
          onClick={handleResetData}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-semibold text-xs hover:bg-red-100 transition-colors min-h-[44px]"
        >
          <Trash2 className="w-4 h-4" />
          Reset All Data & Start Fresh
        </button>
      </div>

      {/* Local-First Privacy Notice */}
      <div className="bg-gray-100/70 dark:bg-gray-800/40 rounded-2xl p-4 text-center space-y-1">
        <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          100% Local-First & Private
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">
          All records are stored securely in your browser's IndexedDB. Zero login required, no tracking.
        </p>
      </div>
    </div>
  );
};
