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
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Today's Classes
        </h3>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {slots.length} {slots.length === 1 ? 'class' : 'classes'} scheduled
        </span>
      </div>

      {isSwapDay && swapNote && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
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
        <div className="space-y-3">
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
                className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition-all hover:border-gray-200 dark:hover:border-gray-700"
              >
                {/* Left: Course details, color stripe, single-line time */}
                <div className="flex items-start gap-3 min-w-0">
                  <span
                    className="w-2.5 h-10 rounded-full flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: course.color || '#6366f1' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                        {course.name}
                      </h4>
                      {course.code && (
                        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-800 uppercase">
                          {course.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex-wrap">
                      {/* One line timing, no wrapping */}
                      <span className="inline-flex items-center gap-1 font-semibold font-mono whitespace-nowrap text-gray-700 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        {slot.start_time} - {slot.end_time}
                      </span>
                      {slot.room && (
                        <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          Room {slot.room}
                        </span>
                      )}
                      <span className="text-[10px] uppercase font-bold text-gray-400">
                        {slot.component_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Buttons below class info on narrow widths (<640px) and beside it on wider screens (>=640px) */}
                <div className="w-full sm:w-auto grid grid-cols-3 sm:flex sm:items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 flex-shrink-0">
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'present')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold min-h-[42px] sm:min-h-[38px] transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-none font-bold'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50'
                    }`}
                    title="Mark Present"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    Present
                  </button>
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'absent')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold min-h-[42px] sm:min-h-[38px] transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-md shadow-rose-200 dark:shadow-none font-bold'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50'
                    }`}
                    title="Mark Absent"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    Absent
                  </button>
                  <button
                    onClick={() => onMarkAttendance(course.id, slot.id, 'cancelled')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-medium min-h-[42px] sm:min-h-[38px] transition-all focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:outline-none ${
                      currentStatus === 'cancelled'
                        ? 'bg-gray-700 text-white shadow-sm font-bold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
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
