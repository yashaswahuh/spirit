import React from 'react';
import { Clock, Check, X, Ban, CalendarCheck, CalendarOff } from 'lucide-react';
import { Course, TimetableSlot, AttendanceRecord, AttendanceStatus } from '../../types';

interface TodayClassesSectionProps {
  slots: TimetableSlot[];
  courses: Course[];
  recordsToday: AttendanceRecord[];
  isHoliday: boolean;
  holidayNote?: string;
  isSwapDay: boolean;
  swapNote?: string;
  onMarkAttendance: (courseId: string, slotId: string | null, status: AttendanceStatus) => void;
}

export const TodayClassesSection: React.FC<TodayClassesSectionProps> = ({
  slots,
  courses,
  recordsToday,
  isHoliday,
  holidayNote,
  isSwapDay,
  swapNote,
  onMarkAttendance,
}) => {
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  if (isHoliday) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-5 text-center">
        <CalendarOff className="w-8 h-8 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Holiday Today</h3>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">{holidayNote || 'No classes scheduled today'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Today's Classes
        </h3>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {slots.length} {slots.length === 1 ? 'class' : 'classes'} scheduled
        </span>
      </div>

      {isSwapDay && swapNote && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3 py-2 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
          ℹ️ {swapNote}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No classes scheduled for today. Enjoy your free time!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {slots.map(slot => {
            const course = courseMap.get(slot.course_id);
            if (!course) return null;

            // Find if attendance is already logged today for this slot/course
            const currentRecord = recordsToday.find(
              r => r.course_id === course.id && (r.slot_id === slot.id || r.slot_id === null)
            );
            const currentStatus = currentRecord?.status;

            return (
              <div
                key={slot.id}
                className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                {/* Left: Course details and timing */}
                <div className="flex items-start gap-3">
                  <span
                    className="w-2 h-10 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                      {course.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1 font-medium font-mono">
                        <Clock className="w-3 h-3" />
                        {slot.start_time} - {slot.end_time}
                      </span>
                      {slot.room && (
                        <span className="px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-semibold">
                          {slot.room}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-semibold text-gray-400">
                        {slot.component_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: One-tap action buttons */}
                <div className="flex items-center gap-1.5 self-end sm:self-center">
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'present')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600 ring-offset-1'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                    title="Mark Present"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Present
                  </button>
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'absent')}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold min-h-[36px] transition-all ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600 ring-offset-1'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300'
                    }`}
                    title="Mark Absent"
                  >
                    <X className="w-3.5 h-3.5" />
                    Absent
                  </button>
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'cancelled')}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium min-h-[36px] transition-all ${
                      currentStatus === 'cancelled'
                        ? 'bg-gray-700 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                    title="Mark Class Cancelled"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    Cancelled
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
