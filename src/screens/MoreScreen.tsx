import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Sparkles,
  Trash2,
  Sun,
  Moon,
  Monitor,
  ShieldCheck,
  User,
  CheckSquare,
  HardDriveDownload,
  Smartphone,
  Calendar,
  Database,
  CheckCircle2,
  Bell,
  Save,
  Palette,
  Clock,
  Info,
  Send,
  CalendarDays,
  Pencil,
  BookOpen,
  ArrowRight,
  RotateCcw,
  Check,
  RefreshCw,
} from 'lucide-react';
import { db } from '../db/dexie';
import { seedDemoData, hasDemoData, clearDemoData, resetDatabase } from '../db/repositories/setup.repo';
import { syncAllCoursesAttendanceWeights } from '../db/repositories/attendance.repo';
import { PageContainer } from '../components/layout/PageContainer';
import { TasksTrackerModal } from '../components/tasks/TasksTrackerModal';
import { BackupModal } from '../components/safety/BackupModal';
import { DeviceTransferModal } from '../components/safety/DeviceTransferModal';
import { DeleteDataModal } from '../components/safety/DeleteDataModal';
import { ClearAttendanceModal } from '../components/attendance/ClearAttendanceModal';
import { InstallGuidanceModal } from '../components/safety/InstallGuidanceModal';
import { PrivacyModal } from '../components/safety/PrivacyModal';
import { PeriodTimingsModal } from '../components/timetable/PeriodTimingsModal';
import { ProfileEditModal } from '../components/profile/ProfileEditModal';
import { SemesterSwitcherModal } from '../components/timetable/SemesterSwitcherModal';
import { UserGuideModal } from '../components/common/UserGuideModal';
import { useI18n } from '../i18n';
import {
  ThemePreference,
  AccentPreference,
  ACCENT_COLORS,
  getAccentPreference,
  setAccentPreference,
  WeekStartDay,
  getWeekStartDay,
  setWeekStartDay,
  TimeFormat,
  getTimeFormat,
  setTimeFormat,
  DateFormatPattern,
  getDateFormat,
  setDateFormat,
  LabAttendanceRule,
  getLabAttendanceRule,
  setLabAttendanceRule,
} from '../utils/preferences';
import {
  getNotificationPermission,
  checkNotificationPermission,
  requestNotificationPermission,
  sendTestNotification,
  isNativePlatform,
} from '../utils/notifications';
import {
  generateTimetableIcs,
  generateTasksIcs,
  downloadOrShareIcs,
} from '../utils/ics';
import {
  getLastBackupTimestamp,
  getChangesSinceBackup,
  checkPersistentStorage,
  requestPersistentStorage,
  getStorageEstimate,
  getBackupThresholds,
  setBackupThresholds,
  StorageEstimateInfo,
} from '../utils/storage';
import {
  checkStoragePermissions,
  requestStoragePermissions,
} from '../utils/storagePermissions';
import {
  checkForLiveUpdate,
  applyUpdateNow,
  isUpdatePendingRestart,
  CURRENT_APP_VERSION,
} from '../utils/updater';

interface MoreScreenProps {
  isDark: boolean;
  themePref: ThemePreference;
  onThemePrefChange: (pref: ThemePreference) => void;
  onToggleTheme: () => void;
  onResetApp: () => void;
}

export const MoreScreen: React.FC<MoreScreenProps> = ({
  themePref,
  onThemePrefChange,
  onResetApp,
}) => {
  const { t } = useI18n();
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const tasks = useLiveQuery(() => db.task.filter(t => t.deleted_at === null).toArray()) || [];
  const gradingSchemes = useLiveQuery(() => db.grading_scheme.filter(g => g.deleted_at === null).toArray()) || [];

  // Modals state
  const [isTasksOpen, setIsTasksOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isClearAttendanceOpen, setIsClearAttendanceOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isPeriodTimingsOpen, setIsPeriodTimingsOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [isSemesterSwitcherOpen, setIsSemesterSwitcherOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Storage and Safety state
  const [isPersisted, setIsPersisted] = useState<boolean | null>(null);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateInfo | null>(null);
  const [daysThreshold, setDaysThreshold] = useState<number>(7);
  const [changesThreshold, setChangesThreshold] = useState<number>(20);
  const [thresholdSaved, setThresholdSaved] = useState(false);

  // Preference states
  const [accent, setAccentState] = useState<AccentPreference>(getAccentPreference);
  const [weekStart, setWeekStartState] = useState<WeekStartDay>(getWeekStartDay);
  const [timeFormat, setTimeFormatState] = useState<TimeFormat>(getTimeFormat);
  const [dateFormat, setDateFormatState] = useState<DateFormatPattern>(getDateFormat);
  const [labAttendanceRule, setLabAttendanceRuleState] = useState<LabAttendanceRule>(getLabAttendanceRule);

  // Default target threshold state
  const [defaultThreshold, setDefaultThreshold] = useState<number>(profile?.default_attendance_threshold || 75);
  const [thresholdGoalSaved, setThresholdGoalSaved] = useState(false);

  const handleLabAttendanceRuleChange = async (rule: LabAttendanceRule) => {
    setLabAttendanceRule(rule);
    setLabAttendanceRuleState(rule);
    await syncAllCoursesAttendanceWeights(rule);
  };

  // Notification status
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission);
  const [isTestingNotif, setIsTestingNotif] = useState(false);
  const [icsExporting, setIcsExporting] = useState<'timetable' | 'tasks' | null>(null);

  const lastBackupAt = getLastBackupTimestamp();
  const changesCount = getChangesSinceBackup();
  const isDemoMode = useLiveQuery(() => hasDemoData()) ?? false;

  // Storage Permission status
  const [hasStoragePerm, setHasStoragePerm] = useState(false);

  // Live OTA Update status
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatusMsg, setUpdateStatusMsg] = useState<string | null>(null);
  const [isUpdatePending, setIsUpdatePending] = useState(isUpdatePendingRestart());

  useEffect(() => {
    checkPersistentStorage().then(setIsPersisted);
    getStorageEstimate().then(setStorageInfo);
    const thresholds = getBackupThresholds();
    setDaysThreshold(thresholds.daysThreshold);
    setChangesThreshold(thresholds.changesThreshold);
    checkNotificationPermission().then(setNotifPermission);
    checkStoragePermissions().then(setHasStoragePerm);
  }, []);

  useEffect(() => {
    if (profile?.default_attendance_threshold) {
      setDefaultThreshold(profile.default_attendance_threshold);
    }
  }, [profile?.default_attendance_threshold]);

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

  const handleSaveBackupThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setBackupThresholds(daysThreshold, changesThreshold);
    setThresholdSaved(true);
    setTimeout(() => setThresholdSaved(false), 2000);
  };

  const handleSaveAttendanceGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    await db.profile.update(profile.id, {
      default_attendance_threshold: Number(defaultThreshold),
      updated_at: new Date().toISOString(),
    });
    setThresholdGoalSaved(true);
    setTimeout(() => setThresholdGoalSaved(false), 2000);
  };

  const handleGradingScaleChange = async (scaleId: string) => {
    if (!program) return;
    await db.program.update(program.id, {
      grading_scheme_id: scaleId,
      updated_at: new Date().toISOString(),
    });
  };

  const handleAccentChange = (newAccent: AccentPreference) => {
    setAccentPreference(newAccent);
    setAccentState(newAccent);
  };

  const handleWeekStartChange = (day: WeekStartDay) => {
    setWeekStartDay(day);
    setWeekStartState(day);
  };

  const handleTimeFormatChange = (fmt: TimeFormat) => {
    setTimeFormat(fmt);
    setTimeFormatState(fmt);
  };

  const handleDateFormatChange = (fmt: DateFormatPattern) => {
    setDateFormat(fmt);
    setDateFormatState(fmt);
  };

  const handleRequestNotifPermission = async () => {
    const res = await requestNotificationPermission();
    setNotifPermission(res);
  };

  const handleSendTestNotification = async () => {
    setIsTestingNotif(true);
    try {
      const sent = await sendTestNotification();
      if (!sent && notifPermission === 'denied') {
        alert(
          isNativePlatform()
            ? 'Notifications are blocked in your phone settings. Please enable notifications for Spirit in Android App Info.'
            : 'Notifications are blocked by your browser. Please enable notifications in your browser site permissions.'
        );
      }
    } finally {
      setIsTestingNotif(false);
      const updated = await checkNotificationPermission();
      setNotifPermission(updated);
    }
  };

  const handleRequestStoragePermission = async () => {
    const granted = await requestStoragePermissions();
    setHasStoragePerm(granted);
    if (granted) {
      alert('Storage permission granted! Spirit can now save PDF reports and backups.');
    } else {
      alert('Storage permission was not granted. Please enable storage in Android App Permissions.');
    }
  };

  const handleCheckForUpdates = async () => {
    setIsCheckingUpdate(true);
    setUpdateStatusMsg('Checking GitHub Pages for updates...');
    try {
      const res = await checkForLiveUpdate();
      if (res.hasUpdate) {
        setIsUpdatePending(true);
        setUpdateStatusMsg(`v${res.latestVersion} downloaded! Ready to restart.`);
      } else if (res.error) {
        setUpdateStatusMsg(`Check failed: ${res.error}`);
      } else {
        setUpdateStatusMsg(`Up to date! Running latest v${res.currentVersion}`);
      }
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleExportTimetableIcs = async () => {
    if (!activeTerm) {
      alert('No active semester found to export timetable.');
      return;
    }
    setIcsExporting('timetable');
    try {
      const ics = generateTimetableIcs({
        term: activeTerm,
        slots,
        courses,
      });
      const filename = `Spirit_Timetable_${activeTerm.name.replace(/\s+/g, '_')}.ics`;
      await downloadOrShareIcs(filename, ics);
    } finally {
      setIcsExporting(null);
    }
  };

  const handleExportTasksIcs = async () => {
    setIcsExporting('tasks');
    try {
      const ics = generateTasksIcs({
        tasks,
        courses,
      });
      const filename = `Spirit_Exams_Deadlines_${new Date().toISOString().slice(0, 10)}.ics`;
      await downloadOrShareIcs(filename, ics);
    } finally {
      setIcsExporting(null);
    }
  };

  const handleSeedDemo = async () => {
    if (confirm('Load demo semester data? This will add sample subjects, timetable, and attendance logs tagged as demo data.')) {
      await seedDemoData();
    }
  };

  const handleClearDemo = async () => {
    if (confirm('Clear all demo data? This will remove sample subjects and demo attendance records while keeping any real data.')) {
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
      {/* Header */}
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {t.settings.title}
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          Preferences, alarms, backup, and local storage management
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Left Column: Profile, Appearance & Preferences */}
        <div className="space-y-4 sm:space-y-6">
          {/* Profile Info Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-600" />
                Student Profile
              </h3>
              <button
                type="button"
                onClick={() => setIsProfileEditOpen(true)}
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 min-h-[36px] px-2"
              >
                <Pencil className="w-3 h-3" />
                Edit Profile
              </button>
            </div>
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
                <span className="text-gray-600 dark:text-gray-400">Batch & Graduation</span>
                <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                  {program?.start_year} – {(program?.start_year || 0) + (program?.duration_years || 4)} ({program?.duration_years || 4} Yrs • Est. End: {(program?.start_year || 0) + (program?.duration_years || 4)})
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Semester</span>
                <button
                  type="button"
                  onClick={() => setIsSemesterSwitcherOpen(true)}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 text-xs sm:text-sm"
                >
                  <span>{activeTerm?.name || 'Semester 1'}</span>
                  <span className="text-xs text-indigo-500 font-bold">&rarr; Switch</span>
                </button>
              </div>
            </div>

            {/* Attendance Target Form */}
            <form onSubmit={handleSaveAttendanceGoal} className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  Default Target Threshold
                </label>
                <span className="text-[11px] text-gray-400">Required percentage for safe status</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={defaultThreshold}
                  onChange={e => setDefaultThreshold(Number(e.target.value))}
                  className="w-16 px-2.5 py-1.5 text-xs text-center font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center gap-1"
                >
                  {thresholdGoalSaved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  Save
                </button>
              </div>
            </form>
          </div>

          {/* How to Use Guide Card */}
          <div
            onClick={() => setIsGuideOpen(true)}
            className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200 dark:border-indigo-900/60 hover:border-indigo-400 dark:hover:border-indigo-700 transition-all cursor-pointer group shadow-xs flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2 flex-wrap">
                  How to Use Spirit Guide
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300">
                    User Manual
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 pt-0.5 truncate">
                  Attendance math, safe bunks, timetable upload, GPA rules & backups.
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
          </div>

          {/* Display & Appearance Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-indigo-600" />
              {t.settings.display}
            </h3>

            {/* Theme Selector (Light / Dark / System) */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                {t.settings.themeMode}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as ThemePreference[]).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onThemePrefChange(mode)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      themePref === mode
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    {mode === 'light' && <Sun className="w-3.5 h-3.5 text-amber-500" />}
                    {mode === 'dark' && <Moon className="w-3.5 h-3.5 text-indigo-500" />}
                    {mode === 'system' && <Monitor className="w-3.5 h-3.5 text-gray-500" />}
                    <span className="capitalize">{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent Color Picker */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                {t.settings.accentColor}
              </span>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(ACCENT_COLORS) as AccentPreference[]).map(accKey => {
                  const info = ACCENT_COLORS[accKey];
                  const isSelected = accent === accKey;
                  return (
                    <button
                      key={accKey}
                      type="button"
                      onClick={() => handleAccentChange(accKey)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        isSelected
                          ? 'border-indigo-600 bg-gray-50 dark:bg-gray-800 ring-2 ring-indigo-600'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: info.hex }} />
                      <span>{info.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time & Date Format */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {t.settings.timeFormat}
                </label>
                <select
                  value={timeFormat}
                  onChange={e => handleTimeFormatChange(e.target.value as TimeFormat)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="12h">{t.settings.format12h}</option>
                  <option value="24h">{t.settings.format24h}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {t.settings.dateFormat}
                </label>
                <select
                  value={dateFormat}
                  onChange={e => handleDateFormatChange(e.target.value as DateFormatPattern)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (Indian)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                </select>
              </div>
            </div>

            {/* Week Start Day & Period Timings */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {t.settings.weekStartDay}
                </label>
                <select
                  value={weekStart}
                  onChange={e => handleWeekStartChange(Number(e.target.value) as WeekStartDay)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={1}>{t.settings.monday}</option>
                  <option value={0}>{t.settings.sunday}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  Period Timings
                </label>
                <button
                  type="button"
                  onClick={() => setIsPeriodTimingsOpen(true)}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5 min-h-[34px]"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Configure
                </button>
              </div>
            </div>

            {/* Attendance Counting Policy */}
            <div className="pt-2.5 border-t border-gray-100 dark:border-gray-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                  ⚙️ Attendance Counting Rule
                </label>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                  {labAttendanceRule === 'single_session' ? '1 per session' : '1 per hour / period'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Default rule for multi-hour sessions (e.g. labs, electives like NSS, or 2-hour blocks):
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleLabAttendanceRuleChange('per_hour')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between min-h-[52px] ${
                    labAttendanceRule === 'per_hour'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="font-bold">1 per hour / period</span>
                  <span className={`text-[10px] font-normal ${labAttendanceRule === 'per_hour' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    2-hr session = 2 points
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLabAttendanceRuleChange('single_session')}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-left flex flex-col justify-between min-h-[52px] ${
                    labAttendanceRule === 'single_session'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <span className="font-bold">1 per session</span>
                  <span className={`text-[10px] font-normal ${labAttendanceRule === 'single_session' ? 'text-indigo-100' : 'text-gray-400'}`}>
                    2-hr session = 1 point
                  </span>
                </button>
              </div>
            </div>

            {/* Default Grading Scheme */}
            {gradingSchemes.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                  {t.settings.defaultGradingScheme}
                </label>
                <select
                  value={program?.grading_scheme_id || gradingSchemes[0]?.id}
                  onChange={e => handleGradingScaleChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  {gradingSchemes.map((scheme: any) => (
                    <option key={scheme.id} value={scheme.id}>
                      {scheme.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Tasks & Deadlines Manager Card */}
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
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-500 text-gray-800 dark:text-white font-semibold text-xs sm:text-sm transition-colors min-h-[44px]"
            >
              Open Tasks & Exams Manager
            </button>
          </div>
        </div>

        {/* Right Column: Reminders, Calendar Export, Data Safety & Privacy */}
        <div className="space-y-4 sm:space-y-6">
          {/* Reminders & Calendar Export Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-600" />
                {t.reminders.title}
              </h3>
            </div>

            {/* Honest Scope Callout */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3.5 text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span>{isNativePlatform() ? 'Native Android Reminders' : 'Honest Scope Notice'}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300">
                {isNativePlatform()
                  ? 'Native alerts run locally on your phone without external servers or accounts. You can receive system notifications for classes, exams, and backup safety.'
                  : t.reminders.honestScopeNotice}
              </p>
            </div>

            {/* Notifications Controls */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                    {isNativePlatform() ? 'App Notifications & Alerts' : t.reminders.browserNotifications}
                  </span>
                  <span className="text-[11px] text-gray-400">
                    {notifPermission === 'granted'
                      ? (isNativePlatform() ? 'Native system alerts enabled' : 'Alerts active while app is open')
                      : notifPermission === 'denied'
                      ? (isNativePlatform() ? 'Blocked in Android settings' : 'Blocked in browser permissions')
                      : 'Permission not yet requested'}
                  </span>
                </div>
                {notifPermission === 'granted' ? (
                  <button
                    type="button"
                    onClick={handleSendTestNotification}
                    disabled={isTestingNotif}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <Send className="w-3 h-3 text-indigo-600" />
                    {isTestingNotif ? 'Sending...' : 'Test Alert'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotifPermission}
                    disabled={notifPermission === 'unsupported'}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    Enable Alerts
                  </button>
                )}
              </div>
            </div>

            {/* Storage Permissions (Native Android) */}
            {isNativePlatform() && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      Device Storage & File Access
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {hasStoragePerm
                        ? 'Storage permission granted for PDF & backups'
                        : 'Allows Spirit to save PDF reports & backups directly'}
                    </span>
                  </div>
                  {hasStoragePerm ? (
                    <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-1 border border-emerald-200 dark:border-emerald-900/50">
                      <Check className="w-3 h-3" /> Granted
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleRequestStoragePermission}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Allow Access
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Live Auto-Updates (Native Android) */}
            {isNativePlatform() && (
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                      Live Web App Auto-Updates
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {isUpdatePending
                        ? 'New version downloaded! Ready to restart.'
                        : updateStatusMsg || `Active Version: v${CURRENT_APP_VERSION} (Build 1000)`}
                    </span>
                  </div>
                  {isUpdatePending ? (
                    <button
                      type="button"
                      onClick={() => applyUpdateNow()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1 animate-pulse"
                    >
                      <RefreshCw className="w-3 h-3" /> Restart App
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCheckForUpdates}
                      disabled={isCheckingUpdate}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 text-indigo-600 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                      {isCheckingUpdate ? 'Checking...' : 'Check Updates'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Phone Calendar Sync (.ics export) */}
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
              <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                Sync with Phone Calendar (.ics)
              </span>
              <p className="text-[11px] text-gray-400">
                Export files directly to Google Calendar, Apple Calendar, or Outlook to get native system alarm notifications when Spirit is closed.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleExportTimetableIcs}
                  disabled={icsExporting !== null}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
                  {icsExporting === 'timetable' ? 'Exporting...' : 'Timetable (.ics)'}
                </button>
                <button
                  type="button"
                  onClick={handleExportTasksIcs}
                  disabled={icsExporting !== null}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  {icsExporting === 'tasks' ? 'Exporting...' : 'Exams (.ics)'}
                </button>
              </div>
            </div>
          </div>

          {/* Backup & Restore Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDriveDownload className="w-3.5 h-3.5 text-indigo-600" />
                Backup & Restore
              </h3>
              {lastBackupAt ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(lastBackupAt).toLocaleDateString()}
                  </span>
                  {changesCount > 0 && (
                    <span className="text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0.5 rounded">
                      {changesCount} new {changesCount === 1 ? 'change' : 'changes'}
                    </span>
                  )}
                </div>
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
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-indigo-600" />
                  Export & Import Data (JSON / CSV)
                </span>
                <span className="text-xs text-gray-400">&rarr;</span>
              </button>

              <button
                onClick={() => setIsTransferOpen(true)}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs sm:text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                <span className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-indigo-600" />
                  Transfer to Another Device
                </span>
                <span className="text-xs text-gray-400">&rarr;</span>
              </button>
            </div>
          </div>

          {/* Storage Safety & Persistence Card */}
          <div className="bg-white dark:bg-gray-900 p-5 sm:p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              Device Storage Safety
            </h3>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/80 text-xs">
              <div className="py-2 flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Persistent Storage Status</span>
                {isPersisted ? (
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Granted (Safe from Eviction)
                  </span>
                ) : (
                  <button
                    onClick={handleRequestPersistence}
                    className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Request Persistence
                  </button>
                )}
              </div>

              {storageInfo && (
                <div className="py-2 flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Approximate Storage Used</span>
                  <span className="font-mono text-gray-800 dark:text-gray-200">
                    {storageInfo.usageFormatted} of {storageInfo.quotaFormatted}
                  </span>
                </div>
              )}
            </div>

            {/* Configurable Reminder Thresholds */}
            <form onSubmit={handleSaveBackupThresholds} className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">
                  Backup Reminder Rules
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDaysThreshold(1);
                      setChangesThreshold(5);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                      daysThreshold === 1
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    Daily (1 Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDaysThreshold(7);
                      setChangesThreshold(20);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-[11px] font-bold transition-all ${
                      daysThreshold === 7
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    Weekly (7 Days)
                  </button>
                </div>
              </div>

              {daysThreshold === 1 && (
                <div className="p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />
                  <span>Daily reminders active: you will be prompted daily to export backups, safeguarding against data loss.</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-gray-500 dark:text-gray-400 block mb-1">Days without backup</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={daysThreshold}
                    onChange={e => setDaysThreshold(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-gray-500 dark:text-gray-400 block mb-1">Changes since backup</label>
                  <input
                    type="number"
                    min="5"
                    max="500"
                    value={changesThreshold}
                    onChange={e => setChangesThreshold(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-1.5"
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
                onClick={() => setIsClearAttendanceOpen(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300 font-semibold text-xs sm:text-sm hover:bg-rose-100/60 dark:hover:bg-rose-900/40 transition-colors min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Clear Logged Attendance Data (Keep Subjects & Schedule)
              </button>
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

          {/* About / Version Footer */}
          <div className="text-center text-[11px] text-gray-400 dark:text-gray-500 space-y-1">
            <p className="font-semibold text-gray-600 dark:text-gray-400">Spirit v1.0.0 • Offline-First Academic Tracker</p>
            <p>Built with Vite, React, TypeScript, Tailwind CSS, vitest & Dexie</p>
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

      {isPeriodTimingsOpen && (
        <PeriodTimingsModal
          isOpen={isPeriodTimingsOpen}
          onClose={() => setIsPeriodTimingsOpen(false)}
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

      {isClearAttendanceOpen && (
        <ClearAttendanceModal
          isOpen={isClearAttendanceOpen}
          onClose={() => setIsClearAttendanceOpen(false)}
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

      {isProfileEditOpen && (
        <ProfileEditModal
          isOpen={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profile={profile}
          program={program}
        />
      )}

      {isSemesterSwitcherOpen && (
        <SemesterSwitcherModal
          isOpen={isSemesterSwitcherOpen}
          onClose={() => setIsSemesterSwitcherOpen(false)}
        />
      )}

      {isGuideOpen && (
        <UserGuideModal
          isOpen={isGuideOpen}
          onClose={() => setIsGuideOpen(false)}
        />
      )}
    </PageContainer>
  );
};
