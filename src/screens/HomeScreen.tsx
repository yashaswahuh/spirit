import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, BookOpen, Clock, CalendarCheck, Sparkles } from 'lucide-react';
import { db } from '../db/dexie';
import type { TimetableSlot, Course } from '../types';
import { computeCourseAttendanceStats, countUnmarkedClasses } from '../engine/attendance';
import { canISkipTomorrow } from '../engine/whatif';
import { getTodayTimetableSlots } from '../db/repositories/timetable.repo';
import { markAttendance } from '../db/repositories/attendance.repo';
import { hasDemoData, clearDemoData, seedDemoData } from '../db/repositories/setup.repo';
import { TodayClassesSection } from '../components/home/TodayClassesSection';
import { CanISkipTomorrowCard } from '../components/home/CanISkipTomorrowCard';
import { UpcomingTasksWidget } from '../components/home/UpcomingTasksWidget';
import { CatchUpModal } from '../components/attendance/CatchUpModal';
import { WhatIfModal } from '../components/attendance/WhatIfModal';
import { BackupReminderBanner } from '../components/safety/BackupReminderBanner';
import { BackupModal } from '../components/safety/BackupModal';
import { EmptyState } from '../components/common/EmptyState';
import { PageContainer } from '../components/layout/PageContainer';

interface HomeScreenProps {
  onNavigateToAttendance: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToAttendance }) => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const isDemoMode = useLiveQuery(() => hasDemoData()) ?? false;
  const [clearingDemo, setClearingDemo] = useState(false);

  // Modals state
  const [isCatchUpOpen, setIsCatchUpOpen] = useState(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Today's schedule state
  const [todaySlots, setTodaySlots] = useState<TimetableSlot[]>([]);
  const [isHoliday, setIsHoliday] = useState(false);
  const [holidayNote, setHolidayNote] = useState<string | undefined>();
  const [isSwapDay, setIsSwapDay] = useState(false);
  const [swapNote, setSwapNote] = useState<string | undefined>();

  const todayStr = new Date().toISOString().slice(0, 10);
  const recordsToday = records.filter(r => r.date === todayStr);

  useEffect(() => {
    getTodayTimetableSlots().then(res => {
      setTodaySlots(res.slots);
      setIsHoliday(res.isHoliday);
      setHolidayNote(res.holidayNote);
      setIsSwapDay(res.isSwapDay);
      setSwapNote(res.swapNote);
    });
  }, [records, courses]);

  // Overall attendance calculation across all courses with opening balances
  let totalAttended = 0;
  let totalConducted = 0;
  let inDangerCount = 0;
  const threshold = profile?.default_attendance_threshold || 75;

  const courseStatsList = courses.map(c => {
    const courseRecords = records.filter(r => r.course_id === c.id);
    const stats = computeCourseAttendanceStats(
      courseRecords,
      {
        medical_counts_as_present: c.medical_counts_as_present,
        duty_leave_counts_as_present: c.duty_leave_counts_as_present,
      },
      c.attendance_threshold_override || threshold,
      {
        initialAttended: c.initial_attended,
        initialConducted: c.initial_conducted,
        trackingStartDate: c.tracking_start_date,
      }
    );

    totalAttended += stats.attended;
    totalConducted += stats.conducted;
    if (stats.is_in_danger) inDangerCount++;

    return { course: c, stats };
  });

  const overallPercentage = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100.0;
  const isOverallSafe = totalConducted === 0 || overallPercentage >= threshold;

  // Unmarked classes count in the past
  const unmarkedCount = countUnmarkedClasses({
    startDate: activeTerm?.start_date || todayStr,
    endDate: todayStr,
    slots,
    versions,
    overrides,
    calendarEvents,
    records,
    courses,
    workingDays: activeTerm?.working_days || [1, 2, 3, 4, 5, 6],
    saturdayRule: activeTerm?.saturday_rule,
  });

  // Tomorrow calculation for "Can I Skip Tomorrow?"
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().slice(0, 10);

  const subjectStates = courseStatsList.map(({ course, stats }) => ({
    course_id: course.id,
    course_name: course.name,
    attended: stats.attended,
    conducted: stats.conducted,
    threshold: course.attendance_threshold_override || threshold,
  }));

  const skipTomorrowResult = canISkipTomorrow(
    tomorrowStr,
    subjectStates,
    {
      versions,
      slots,
      calendarEvents,
      overrides,
      workingDays: activeTerm?.working_days || [1, 2, 3, 4, 5, 6],
      saturdayRule: activeTerm?.saturday_rule,
    }
  );

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  const handleMarkToday = async (courseId: string, slotId: string | null, status: any) => {
    await markAttendance({
      course_id: courseId,
      date: todayStr,
      slot_id: slotId,
      status,
    });
  };

  const handleClearDemo = async () => {
    if (window.confirm('Clear all demo data? This will reset demo courses, timetable, and attendance records.')) {
      setClearingDemo(true);
      try {
        await clearDemoData();
      } catch (err) {
        console.error('Failed to clear demo data', err);
      } finally {
        setClearingDemo(false);
      }
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in">
      {/* Greeting Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-gray-100 dark:border-gray-800/80">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Hello, {profile?.name || 'Student'} 👋
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {formattedDate} • {activeTerm?.name || 'Current Term'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40">
            <Clock className="w-3.5 h-3.5" />
            {todaySlots.length} Classes Today
          </span>
        </div>
      </div>

      {/* Demo Mode Banner (Dismissible / Actionable) */}
      {isDemoMode && (
        <div className="p-3.5 sm:p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-3xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200 truncate">
                Demo Mode Active
              </h4>
              <p className="text-[11px] sm:text-xs text-indigo-700 dark:text-indigo-300 truncate">
                Sample semester data is loaded. Real data never mixes silently with demo data.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearDemo}
            disabled={clearingDemo}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 min-h-[36px]"
          >
            {clearingDemo ? 'Clearing...' : 'Clear Demo'}
          </button>
        </div>
      )}

      {/* Backup Reminder Banner (Dismissible) */}
      <BackupReminderBanner onOpenBackup={() => setIsBackupOpen(true)} />

      {/* Unmarked Classes Catch-Up Banner */}
      {unmarkedCount > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-3xl border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200 truncate">
                {unmarkedCount} Unmarked {unmarkedCount === 1 ? 'Period' : 'Periods'} from Past Days
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 truncate">
                Unmarked classes are excluded from conducted totals until you log them.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCatchUpOpen(true)}
            className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 min-h-[38px]"
          >
            Catch Up Now
          </button>
        </div>
      )}

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects registered"
          description="You don't have any subjects registered yet for this term. Add subjects in the Attendance tab or load sample data to explore."
          actionText="Load Sample Data"
          onAction={async () => { await seedDemoData(); }}
        />
      ) : (
        /* Multi-column layout on Desktop (lg:grid-cols-12), single column on Mobile */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Primary Column: Hero Card, Can I Skip Tomorrow & Today's Schedule */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          {/* Can I Skip Tomorrow Card */}
          <CanISkipTomorrowCard
            result={skipTomorrowResult}
            courseMap={courseMap}
            onOpenWhatIfModal={() => setIsWhatIfOpen(true)}
          />

          {/* Overall Attendance Hero Card */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 rounded-3xl p-5 sm:p-7 text-white shadow-xl shadow-indigo-100 dark:shadow-none space-y-5 relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-indigo-200">
                Overall Attendance
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-white/20 backdrop-blur-md font-semibold">
                Target: {threshold}%
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-4">
              <div>
                <span className="text-4xl sm:text-5xl font-black tracking-tight">
                  {totalConducted > 0 ? `${overallPercentage.toFixed(1)}%` : '100%'}
                </span>
                <p className="text-xs sm:text-sm text-indigo-100 mt-1.5 font-medium">
                  {totalAttended} attended out of {totalConducted} conducted classes
                </p>
              </div>

              <div>
                {totalConducted === 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 text-white">
                    <ShieldCheck className="w-4 h-4" />
                    Fresh Term
                  </span>
                ) : isOverallSafe ? (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-emerald-400/25 text-emerald-100 border border-emerald-400/30">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    Safe
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-rose-400/25 text-rose-100 border border-rose-400/30">
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    In Danger
                  </span>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  totalConducted === 0
                    ? 'bg-white/40'
                    : isOverallSafe
                    ? 'bg-emerald-400'
                    : 'bg-rose-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, overallPercentage))}%` }}
              />
            </div>

            {/* Status Callout Strip */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs sm:text-sm text-indigo-100">
              <div>
                {inDangerCount === 0 ? (
                  <span className="text-emerald-200 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    All {courses.length} subjects are safely above {threshold}%
                  </span>
                ) : (
                  <span className="text-rose-200 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    {inDangerCount} {inDangerCount === 1 ? 'subject requires' : 'subjects require'} immediate attendance
                  </span>
                )}
              </div>
              <button
                onClick={onNavigateToAttendance}
                className="font-bold underline flex items-center gap-1 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none rounded px-1"
              >
                Subject Details <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Today's Classes Section (One-tap logging) */}
          <TodayClassesSection
            slots={todaySlots}
            courses={courses}
            recordsToday={recordsToday}
            isHoliday={isHoliday}
            holidayNote={holidayNote}
            isSwapDay={isSwapDay}
            swapNote={swapNote}
            onMarkAttendance={handleMarkToday}
          />
        </div>

        {/* Right Column: Tasks/Exams & Subject Health Breakdown */}
        <div className="lg:col-span-5 xl:col-span-5 space-y-6">
          {/* Upcoming Tasks & Exams Widget */}
          <UpcomingTasksWidget courses={courses} />

          {/* Subject Health Card */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                Subject Health Overview
              </h3>
              <button
                onClick={onNavigateToAttendance}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none rounded"
              >
                View All ({courses.length})
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {courseStatsList.map(({ course, stats }) => (
                <div key={course.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color || '#6366f1' }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                        {course.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 font-medium">
                        {course.code || 'Course'} • {stats.attended}/{stats.conducted} classes
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span
                      className={`text-xs sm:text-sm font-black ${
                        stats.is_in_danger
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {stats.conducted > 0 ? `${stats.percentage.toFixed(0)}%` : '100%'}
                    </span>
                    <p className="text-[10px] text-gray-400 font-medium">
                      {stats.is_in_danger
                        ? `Need ${stats.must_attend}`
                        : `Skip ${stats.safe_bunks}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Catch-Up Modal */}
      <CatchUpModal
        isOpen={isCatchUpOpen}
        onClose={() => setIsCatchUpOpen(false)}
      />

      {/* What-If Simulation Modal */}
      <WhatIfModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        courses={courses}
        profileThreshold={threshold}
      />

      {/* Backup Modal from Banner */}
      {isBackupOpen && (
        <BackupModal
          isOpen={isBackupOpen}
          onClose={() => setIsBackupOpen(false)}
        />
      )}
    </PageContainer>
  );
};
