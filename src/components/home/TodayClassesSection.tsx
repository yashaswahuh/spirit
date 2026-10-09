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

            const cardBorder =
              currentStatus === 'present'
                ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-emerald-500/5'
                : currentStatus === 'absent'
                ? 'border-rose-300 dark:border-rose-700/80 bg-rose-50/20 dark:bg-rose-950/10 shadow-rose-500/5'
                : currentStatus === 'cancelled'
                ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-amber-500/5'
                : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900';

            return (
              <div
                key={slot.id}
                className={`rounded-3xl p-4 sm:p-5 border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:shadow-md ${cardBorder}`}
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
                        <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 uppercase">
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
                        <span className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          Room {slot.room}
                        </span>
                      )}
                      {(slot.faculty || course.faculty) && (
                        <span
                          className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 truncate max-w-[150px]"
                          title={slot.faculty || course.faculty || undefined}
                        >
                          👤 {slot.faculty || course.faculty}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        slot.component_type === 'lab'
                          ? 'bg-purple-100 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                          : slot.component_type === 'theory'
                          ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/40'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        {slot.component_type === 'lab'
                          ? `🧪 Lab${slot.weight && slot.weight > 1 ? ` (${slot.weight} hrs)` : ''}`
                          : slot.component_type === 'theory'
                          ? '📘 Theory'
                          : slot.component_type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Buttons below class info on narrow widths (<640px) and beside it on wider screens (>=640px) */}
                <div className="w-full sm:w-auto grid grid-cols-3 sm:flex sm:items-center gap-2 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/80 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'present')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs min-h-[42px] sm:min-h-[40px] transition-all focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-md font-bold'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750 font-medium'
                    }`}
                    title={currentStatus === 'present' ? 'Present (Tap again to clear)' : 'Mark Present'}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Present</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'absent')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl text-xs min-h-[42px] sm:min-h-[40px] transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-md font-bold'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750 font-medium'
                    }`}
                    title={currentStatus === 'absent' ? 'Absent (Tap again to clear)' : 'Mark Absent'}
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Absent</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'cancelled')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-2xl text-xs min-h-[42px] sm:min-h-[40px] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none cursor-pointer active:scale-[0.97] ${
                      currentStatus === 'cancelled'
                        ? 'bg-amber-600 text-white shadow-md font-bold'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-750 font-medium'
                    }`}
                    title={currentStatus === 'cancelled' ? 'Cancelled (Tap again to clear)' : 'Mark Class Cancelled'}
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancelled</span>
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
