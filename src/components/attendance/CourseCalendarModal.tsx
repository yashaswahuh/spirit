import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Ban,
  Activity,
  Shield,
  Sun,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { Course, AttendanceRecord, AttendanceStatus } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { markAttendance, deleteAttendanceRecord } from '../../db/repositories/attendance.repo';
import { getLabAttendanceRule } from '../../utils/preferences';

interface CourseCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CourseCalendarModal: React.FC<CourseCalendarModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedRecordDate, setSelectedRecordDate] = useState<string | null>(null);

  // Queries
  const records = useLiveQuery(() =>
    db.attendance_record
      .where('course_id')
      .equals(course.id)
      .filter(r => r.deleted_at === null)
      .toArray()
  ) || [];

  const recordMap = new Map<string, AttendanceRecord>(records.map(r => [r.date, r]));

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Build calendar matrix
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

  // Padding days from previous month
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const m = currentMonth === 0 ? 12 : currentMonth;
    const y = currentMonth === 0 ? currentYear - 1 : currentYear;
    calendarDays.push({
      dateStr: `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    const m = currentMonth + 1;
    calendarDays.push({
      dateStr: `${currentYear}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`,
      dayNum: d,
      isCurrentMonth: true,
    });
  }

  // Pad remaining to finish grid
  const remainingCells = (7 - (calendarDays.length % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const m = currentMonth === 11 ? 1 : currentMonth + 2;
    const y = currentMonth === 11 ? currentYear + 1 : currentYear;
    calendarDays.push({
      dateStr: `${y}-${m < 10 ? '0' + m : m}-${d < 10 ? '0' + d : d}`,
      dayNum: d,
      isCurrentMonth: false,
    });
  }

  // Handler for updating attendance on a picked date
  const handleSetStatus = async (status: AttendanceStatus | 'clear') => {
    if (!selectedRecordDate) return;

    const existing = recordMap.get(selectedRecordDate);
    if (status === 'clear' || (existing && existing.status === status)) {
      if (existing) {
        await deleteAttendanceRecord(existing.id);
      }
    } else {
      const globalLabRule = getLabAttendanceRule();
      const rule = course.lab_attendance_rule || globalLabRule;
      const isLabCourse = course.type === 'lab' || course.type === 'theory_and_lab';
      let weight = 1;
      if (isLabCourse) {
        weight = rule === 'single_session' ? 1 : 2;
      }
      await markAttendance({
        course_id: course.id,
        date: selectedRecordDate,
        status,
        weight,
        component_type: isLabCourse ? 'lab' : 'theory',
      });
    }
    setSelectedRecordDate(null);
  };

  // Render status badge icon and color indicator (never color alone!)
  const renderStatusBadge = (record?: AttendanceRecord) => {
    if (!record) return null;

    switch (record.status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
            <Check className="w-2.5 h-2.5 text-emerald-600" />
            <span>P</span>
          </span>
        );
      case 'absent':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 text-[10px] font-bold">
            <X className="w-2.5 h-2.5 text-rose-600" />
            <span>A</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 text-[10px] font-bold">
            <Ban className="w-2.5 h-2.5 text-amber-600" />
            <span>C</span>
          </span>
        );
      case 'medical':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/80 text-cyan-800 dark:text-cyan-200 text-[10px] font-bold">
            <Activity className="w-2.5 h-2.5 text-cyan-600" />
            <span>M</span>
          </span>
        );
      case 'duty_leave':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-100 dark:bg-violet-950/80 text-violet-800 dark:text-violet-200 text-[10px] font-bold">
            <Shield className="w-2.5 h-2.5 text-violet-600" />
            <span>D</span>
          </span>
        );
      case 'holiday':
        return (
          <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-bold">
            <Sun className="w-2.5 h-2.5 text-gray-500" />
            <span>H</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${course.name} - Attendance Calendar`}
      description={`Monthly logs and attendance heatmap for ${course.code || 'this subject'}`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Month Header Navigation */}
        <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </h3>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Legend (Never color alone: icon + text + dot) */}
        <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold text-gray-600 dark:text-gray-400 justify-center">
          <span className="inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-emerald-600" /> Present (P)
          </span>
          <span className="inline-flex items-center gap-1">
            <X className="w-3 h-3 text-rose-600" /> Absent (A)
          </span>
          <span className="inline-flex items-center gap-1">
            <Ban className="w-3 h-3 text-amber-600" /> Cancelled (C)
          </span>
          <span className="inline-flex items-center gap-1">
            <Activity className="w-3 h-3 text-cyan-600" /> Medical (M)
          </span>
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3 h-3 text-violet-600" /> Duty (D)
          </span>
        </div>

        {/* Calendar Grid */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden bg-white dark:bg-gray-900">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-center">
            {WEEKDAY_NAMES.map(w => (
              <div key={w} className="py-2 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                {w}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-100 dark:divide-gray-800">
            {calendarDays.map((d, idx) => {
              const record = recordMap.get(d.dateStr);
              const isSelected = selectedRecordDate === d.dateStr;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedRecordDate(d.dateStr)}
                  className={`min-h-[58px] p-1.5 flex flex-col justify-between cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500 z-10'
                      : d.isCurrentMonth
                      ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                      : 'bg-gray-50/50 dark:bg-gray-950/40 opacity-40'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${isSelected ? 'text-indigo-600 font-black' : 'text-gray-700 dark:text-gray-300'}`}>
                    {d.dayNum}
                  </span>
                  <div className="flex items-center justify-center">
                    {renderStatusBadge(record)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Edit Sheet / Popover for Selected Date */}
        {selectedRecordDate && (() => {
          const currentRec = recordMap.get(selectedRecordDate);
          const currentStatus = currentRec?.status;

          return (
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2.5 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>Edit Attendance for {selectedRecordDate}</span>
                  {currentStatus && (
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                      Currently: {currentStatus}
                    </span>
                  )}
                </h4>
                <button
                  type="button"
                  onClick={() => setSelectedRecordDate(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[
                  { status: 'present' as AttendanceStatus, label: 'Present', activeBg: 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900' },
                  { status: 'absent' as AttendanceStatus, label: 'Absent', activeBg: 'bg-rose-600 text-white shadow-md ring-2 ring-rose-500 ring-offset-2 dark:ring-offset-gray-900' },
                  { status: 'cancelled' as AttendanceStatus, label: 'Cancelled', activeBg: 'bg-amber-600 text-white shadow-md ring-2 ring-amber-500 ring-offset-2 dark:ring-offset-gray-900' },
                  { status: 'medical' as AttendanceStatus, label: 'Medical', activeBg: 'bg-cyan-600 text-white shadow-md ring-2 ring-cyan-500 ring-offset-2 dark:ring-offset-gray-900' },
                  { status: 'duty_leave' as AttendanceStatus, label: 'Duty', activeBg: 'bg-violet-600 text-white shadow-md ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' },
                ].map(btn => {
                  const isSelected = currentStatus === btn.status;
                  return (
                    <button
                      key={btn.status}
                      type="button"
                      onClick={() => handleSetStatus(btn.status)}
                      className={`py-2 px-1.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center justify-center gap-1 cursor-pointer ${
                        isSelected
                          ? `${btn.activeBg} font-black scale-[1.02]`
                          : 'bg-white dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      title={isSelected ? `${btn.label} (Tap to unmark)` : `Mark ${btn.label}`}
                    >
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => handleSetStatus('clear')}
                  className="py-2 px-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors min-h-[40px] cursor-pointer"
                  title="Clear attendance mark for this date"
                >
                  Clear Log
                </button>
              </div>
            </div>
          );
        })()}

        {/* Term Heatmap Section */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            Term Attendance Heatmap
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Chronological overview of class attendance records. Total logged: {records.length} sessions.
          </p>

          <div className="flex gap-1 overflow-x-auto py-2">
            {records.slice(-40).map((r, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-1"
                title={`${r.date}: ${r.status}`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-md ${
                    r.status === 'present'
                      ? 'bg-emerald-500'
                      : r.status === 'absent'
                      ? 'bg-rose-500'
                      : r.status === 'cancelled'
                      ? 'bg-amber-400'
                      : 'bg-indigo-400'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

