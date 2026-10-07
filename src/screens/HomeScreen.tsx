import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AlertTriangle, CheckCircle2, ShieldCheck, ArrowRight, BookOpen } from 'lucide-react';
import { db } from '../db/dexie';
import type { TimetableSlot } from '../types';
import { computeCourseAttendanceStats } from '../engine/attendance';
import { getTodayTimetableSlots } from '../db/repositories/timetable.repo';
import { markAttendance } from '../db/repositories/attendance.repo';
import { TodayClassesSection } from '../components/home/TodayClassesSection';

interface HomeScreenProps {
  onNavigateToAttendance: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onNavigateToAttendance }) => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];

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

  // Overall attendance calculation across all courses
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
      c.attendance_threshold_override || threshold
    );

    totalAttended += stats.attended;
    totalConducted += stats.conducted;
    if (stats.is_in_danger) inDangerCount++;

    return { course: c, stats };
  });

  const overallPercentage = totalConducted > 0 ? (totalAttended / totalConducted) * 100 : 100.0;
  const isOverallSafe = totalConducted === 0 || overallPercentage >= threshold;

  const handleMarkToday = async (courseId: string, slotId: string | null, status: any) => {
    await markAttendance({
      course_id: courseId,
      date: todayStr,
      slot_id: slotId,
      status,
    });
  };

  const formattedDate = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="p-4 space-y-5 animate-fade-in">
      {/* Greeting Banner */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            Hello, {profile?.name || 'Student'} 👋
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {formattedDate} • {activeTerm?.name || 'Current Term'}
          </p>
        </div>
      </div>

      {/* Overall Attendance Stat Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-5 text-white shadow-lg shadow-indigo-200 dark:shadow-none space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">
            Overall Attendance
          </span>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-sm font-medium">
            Goal: {threshold}%
          </span>
        </div>

        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-4xl font-black tracking-tight">
              {totalConducted > 0 ? `${overallPercentage.toFixed(1)}%` : '100%'}
            </span>
            <p className="text-xs text-indigo-100 mt-1">
              {totalAttended} of {totalConducted} classes attended
            </p>
          </div>

          <div>
            {totalConducted === 0 ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                <ShieldCheck className="w-3.5 h-3.5" />
                Fresh Term
              </span>
            ) : isOverallSafe ? (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/25 text-emerald-100 border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                Safe
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-400/25 text-rose-100 border border-rose-400/30">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-300" />
                In Danger
              </span>
            )}
          </div>
        </div>

        {/* Status Callout Strip */}
        <div className="pt-3 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100">
          <span>
            {inDangerCount === 0 ? (
              <span className="text-emerald-200 font-medium">
                All {courses.length} subjects are safely above {threshold}%
              </span>
            ) : (
              <span className="text-rose-200 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {inDangerCount} {inDangerCount === 1 ? 'subject needs' : 'subjects need'} attention
              </span>
            )}
          </span>
          <button
            onClick={onNavigateToAttendance}
            className="font-bold underline flex items-center gap-0.5 hover:text-white"
          >
            Details <ArrowRight className="w-3 h-3" />
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

      {/* Subjects Overview Teaser */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Subject Health
          </h3>
          <button
            onClick={onNavigateToAttendance}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            View All ({courses.length})
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {courseStatsList.slice(0, 3).map(({ course, stats }) => (
            <div key={course.id} className="py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: course.color || '#6366f1' }}
                />
                <div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[180px]">
                    {course.name}
                  </h4>
                  <span className="text-[10px] text-gray-400">
                    {stats.attended}/{stats.conducted} classes
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span
                  className={`text-xs font-bold ${
                    stats.is_in_danger
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {stats.conducted > 0 ? `${stats.percentage.toFixed(0)}%` : '100%'}
                </span>
                <p className="text-[10px] text-gray-400">
                  {stats.is_in_danger
                    ? `Must attend ${stats.must_attend}`
                    : `Can skip ${stats.safe_bunks}`}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
