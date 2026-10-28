import React from 'react';
import { Clock, Check, X, Ban, CalendarCheck, CalendarOff, GraduationCap } from 'lucide-react';
import { Course, TimetableSlot, AttendanceRecord, AttendanceStatus, Task, ExamClassMode } from '../../types';
import { getTaskTypeLabel } from '../../engine/tasks';
import { addMinutesToTime } from '../../engine/timetable';

interface TodayClassesSectionProps {
  slots: TimetableSlot[];
  courses: Course[];
  recordsToday: AttendanceRecord[];
  isHoliday: boolean;
  holidayNote?: string;
  isSwapDay: boolean;
  swapNote?: string;
  isExamDay?: boolean;
  examNote?: string;
  examTasks?: Task[];
  onUpdateExamClassMode?: (examId: string, mode: ExamClassMode) => Promise<void>;
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
  isExamDay,
  examNote: _examNote,
  examTasks,
  onUpdateExamClassMode,
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
          <CalendarCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Today's Classes
        </h3>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          {slots.length} {slots.length === 1 ? 'class' : 'classes'} scheduled
        </span>
      </div>

      {/* Exam Day Policy Card & Quick Switcher */}
      {isExamDay && examTasks && examTasks.length > 0 && (
        <div className="space-y-3">
          {examTasks.map(exam => {
            const examCourse = exam.course_id ? courseMap.get(exam.course_id) : null;
            const currentMode: ExamClassMode = exam.exam_class_mode || 'cancel_overlapping';
            const startTime = exam.due_at && exam.due_at.includes('T') ? exam.due_at.slice(11, 16) : '09:00';
            const endTime = exam.end_time || addMinutesToTime(startTime, 60);

            return (
              <div
                key={exam.id}
                className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 dark:border-amber-900/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3 animate-fade-in"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-amber-500/20">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          {getTaskTypeLabel(exam.type)} Today
                        </span>
                        {examCourse && (
                          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 truncate">
                            {examCourse.code || examCourse.name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate mt-0.5">
                        {exam.title}
                      </h4>
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                        ⏰ {startTime} - {endTime}
                        {exam.venue && ` • 📍 ${exam.venue}`}
                        {exam.seat_number && ` • 🪑 Seat ${exam.seat_number}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Quick 1-Tap Policy Switcher */}
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-700 dark:text-gray-300">
                      Regular Classes Policy:
                    </span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                      {currentMode === 'cancel_overlapping' && '🔕 Class during exam is cancelled'}
                      {currentMode === 'substitute_exam' && '🔄 Substituted with exam slot'}
                      {currentMode === 'suspend_all' && '🛑 All regular classes suspended'}
                      {currentMode === 'keep_all' && '📚 Regular classes running normally'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                    <button
                      type="button"
                      onClick={() => onUpdateExamClassMode?.(exam.id, 'cancel_overlapping')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentMode === 'cancel_overlapping'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>🔕 Cancel {startTime}-{endTime}</span>
                      <span className={`text-[9.5px] font-normal ${currentMode === 'cancel_overlapping' ? 'text-amber-100' : 'text-gray-400'}`}>
                        Rest of day normal
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateExamClassMode?.(exam.id, 'substitute_exam')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentMode === 'substitute_exam'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>🔄 Substitute Slot</span>
                      <span className={`text-[9.5px] font-normal ${currentMode === 'substitute_exam' ? 'text-amber-100' : 'text-gray-400'}`}>
                        Replace with exam
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateExamClassMode?.(exam.id, 'suspend_all')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentMode === 'suspend_all'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>🛑 Suspend All</span>
                      <span className={`text-[9.5px] font-normal ${currentMode === 'suspend_all' ? 'text-amber-100' : 'text-gray-400'}`}>
                        Full exam day
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onUpdateExamClassMode?.(exam.id, 'keep_all')}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between cursor-pointer ${
                        currentMode === 'keep_all'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>📚 Keep All</span>
                      <span className={`text-[9.5px] font-normal ${currentMode === 'keep_all' ? 'text-amber-100' : 'text-gray-400'}`}>
                        Classes run normally
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isSwapDay && swapNote && (
        <div className="bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl px-3.5 py-2.5 text-xs text-indigo-700 dark:text-indigo-300 font-medium">
          ℹ️ {swapNote}
        </div>
      )}

      {slots.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isExamDay
              ? '🎓 Regular lectures are suspended for exam day. Good luck with your exams!'
              : 'No classes scheduled for today. Enjoy your free time!'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => {
            const course = courseMap.get(slot.course_id);
            if (!course && !slot.is_exam_slot) return null;

            // If this is a substituted exam slot
            if (slot.is_exam_slot) {
              const currentRecord = recordsToday.find(
                r => r.slot_id === slot.id || (slot.course_id && r.course_id === slot.course_id && r.slot_id === null)
              );
              const currentStatus = currentRecord?.status;

              return (
                <div
                  key={slot.id}
                  className="rounded-3xl p-4 sm:p-5 border border-amber-300 dark:border-amber-800/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-2.5 h-10 rounded-full flex-shrink-0 mt-0.5 bg-amber-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          🎓 EXAM SLOT
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight truncate">
                          {slot.exam_title || course?.name || 'Exam'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                        <span className="flex items-center gap-1 font-mono font-bold text-gray-700 dark:text-gray-300">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {slot.start_time} - {slot.end_time}
                        </span>
                        {slot.room && (
                          <span className="flex items-center gap-1 truncate text-amber-700 dark:text-amber-400 font-semibold">
                            📍 {slot.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {slot.course_id && (
                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(slot.course_id, slot.id, 'present')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'present'
                            ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Attended Exam
                      </button>
                      <button
                        type="button"
                        onClick={() => onMarkAttendance(slot.course_id, slot.id, 'absent')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          currentStatus === 'absent'
                            ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                        Absent
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            if (!course) return null;

            // Regular slot
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
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 uppercase">
                        {slot.component_type || course.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <span className="flex items-center gap-1 font-mono font-bold text-gray-700 dark:text-gray-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        {slot.start_time} - {slot.end_time}
                      </span>
                      {slot.room && (
                        <span className="flex items-center gap-1 truncate">
                          📍 {slot.room}
                        </span>
                      )}
                      {slot.faculty && (
                        <span className="flex items-center gap-1 truncate text-gray-400">
                          👤 {slot.faculty}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Quick Attendance Marking Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'present')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      currentStatus === 'present'
                        ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-600/30'
                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Present
                  </button>

                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'absent')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      currentStatus === 'absent'
                        ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-600/30'
                        : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                    }`}
                  >
                    <X className="w-3.5 h-3.5" />
                    Absent
                  </button>

                  <button
                    type="button"
                    onClick={() => onMarkAttendance(course.id, slot.id, 'cancelled')}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      currentStatus === 'cancelled'
                        ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-600/30'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                    }`}
                    title="Class Cancelled / Suspended"
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
