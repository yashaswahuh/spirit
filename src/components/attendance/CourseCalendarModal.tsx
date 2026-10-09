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
import { getLabAttendanceRule, useDateFormat, formatDate } from '../../utils/preferences';

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
  const dateFormat = useDateFormat();
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

  const recordsByDate = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const list = recordsByDate.get(r.date) || [];
    list.push(r);
    recordsByDate.set(r.date, list);
  }

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

  // Handler for adding or updating attendance on a picked date
  const handleSetStatus = async (status: AttendanceStatus | 'clear') => {
    if (!selectedRecordDate) return;
    const dayRecords = recordsByDate.get(selectedRecordDate) || [];

    if (status === 'clear') {
      for (const r of dayRecords) {
        await deleteAttendanceRecord(r.id);
      }
      return;
    }

    const globalLabRule = getLabAttendanceRule();
    const rule = course.lab_attendance_rule || globalLabRule;
    const isLabCourse = course.type === 'lab' || course.type === 'theory_and_lab';
    let weight = 1;
    if (isLabCourse) {
      weight = rule === 'single_session' ? 1 : 2;
    }

    if (dayRecords.length === 1 && dayRecords[0].status === status) {
      // Tapping same status on single session clears it
      await deleteAttendanceRecord(dayRecords[0].id);
    } else if (dayRecords.length === 0) {
      // First session on this date
      await markAttendance({
        course_id: course.id,
        date: selectedRecordDate,
        status,
        weight,
        component_type: isLabCourse ? 'lab' : 'theory',
      });
    } else {
      // Add another session for this date
      await markAttendance({
        course_id: course.id,
        date: selectedRecordDate,
        status,
        weight,
        component_type: isLabCourse ? 'lab' : 'theory',
        createNew: true,
      });
    }
  };

  const handleDeleteSpecificRecord = async (recordId: string) => {
    await deleteAttendanceRecord(recordId);
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
              const dayRecords = recordsByDate.get(d.dateStr) || [];
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
                  <div className="flex items-center justify-center gap-0.5 flex-wrap">
                    {dayRecords.slice(0, 3).map((r, i) => (
                      <span key={r.id || i}>{renderStatusBadge(r)}</span>
                    ))}
                    {dayRecords.length > 3 && (
                      <span className="text-[9px] font-bold text-gray-500">+{dayRecords.length - 3}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Edit Sheet / Popover for Selected Date */}
        {selectedRecordDate && (() => {
          const dayRecords = recordsByDate.get(selectedRecordDate) || [];

          return (
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span>Attendance for {formatDate(selectedRecordDate, dateFormat, { includeWeekday: true })}</span>
                  {dayRecords.length > 0 && (
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">
                      {dayRecords.length} {dayRecords.length === 1 ? 'Session' : 'Sessions'} Logged
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

              {dayRecords.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Logged Sessions ({dayRecords.length}):
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {dayRecords.map((r, idx) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 font-mono text-[10px]">#{idx + 1}</span>
                          {renderStatusBadge(r)}
                          <span className="font-bold capitalize text-gray-800 dark:text-gray-200">
                            {r.status.replace('_', ' ')}
                          </span>
                          {r.weight && r.weight > 1 && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({r.weight} pts)
                            </span>
                          )}
                          {r.component_type && (
                            <span className="text-[10px] uppercase font-bold text-indigo-500">
                              {r.component_type}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteSpecificRecord(r.id)}
                          className="text-rose-500 hover:text-rose-700 text-xs font-bold px-2 py-0.5 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                          title="Delete this session"
                        >
                          ✕ Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">
                  {dayRecords.length === 0 ? 'Mark Class Session:' : 'Add Another Session / Quick Mark:'}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { status: 'present' as AttendanceStatus, label: '+ Present' },
                    { status: 'absent' as AttendanceStatus, label: '+ Absent' },
                    { status: 'cancelled' as AttendanceStatus, label: 'Cancelled' },
                    { status: 'medical' as AttendanceStatus, label: 'Medical' },
                    { status: 'duty_leave' as AttendanceStatus, label: 'Duty' },
                  ].map(btn => (
                    <button
                      key={btn.status}
                      type="button"
                      onClick={() => handleSetStatus(btn.status)}
                      className="py-2 px-1.5 rounded-xl text-xs font-bold transition-all min-h-[40px] flex items-center justify-center gap-1 cursor-pointer bg-white dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <span>{btn.label}</span>
                    </button>
                  ))}
                  {dayRecords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => handleSetStatus('clear')}
                      className="py-2 px-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors min-h-[40px] cursor-pointer"
                      title="Clear all sessions for this date"
                    >
                      Clear All
                    </button>
                  )}
                </div>
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

