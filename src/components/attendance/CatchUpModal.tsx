import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, X, Ban, Sun, Calendar, CheckCircle } from 'lucide-react';
import { db } from '../../db/dexie';
import { AttendanceStatus, Course } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { resolveDaySchedule, EffectiveSlot, resolveSlotAttendanceWeight } from '../../engine/timetable';
import { markAttendance } from '../../db/repositories/attendance.repo';
import { createCalendarEvent } from '../../db/repositories/calendar.repo';
import { getLabAttendanceRule } from '../../utils/preferences';

interface CatchUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCatchUpDone?: () => void;
}

interface UnmarkedDayItem {
  date: string;
  unmarkedSlots: EffectiveSlot[];
}

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  isOpen,
  onClose,
  onCatchUpDone,
}) => {
  const [processingDate, setProcessingDate] = useState<string | null>(null);

  // Queries
  const terms = useLiveQuery(() => db.term.filter(t => t.deleted_at === null).toArray()) || [];
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];

  const activeTerm = terms.find(t => t.status === 'ongoing') || terms[0];
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  // Calculate unmarked days from start of term up to today
  const todayStr = new Date().toISOString().slice(0, 10);
  const termStartDate = activeTerm?.start_date || todayStr;

  const unmarkedDays: UnmarkedDayItem[] = [];
  let totalUnmarkedClasses = 0;

  if (activeTerm && termStartDate <= todayStr) {
    const current = new Date(termStartDate + 'T00:00:00Z');
    const end = new Date(todayStr + 'T00:00:00Z');

    // Key lookup for fast attendance checks: `${course_id}:${date}:${slot_id || ''}`
    const markedSet = new Set(
      records.map(r => `${r.course_id}:${r.date}:${r.slot_id || ''}`)
    );

    const globalLabRule = getLabAttendanceRule();

    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      const schedule = resolveDaySchedule({
        date: dateStr,
        versions,
        slots,
        calendarEvents,
        overrides,
        workingDays: activeTerm.working_days || [1, 2, 3, 4, 5, 6],
        saturdayRule: activeTerm.saturday_rule,
        courses,
        labAttendanceRule: globalLabRule,
      });

      if (!schedule.is_holiday && schedule.slots.length > 0) {
        const dayUnmarked = schedule.slots.filter(s => {
          const course = courseMap.get(s.course_id);
          // If course has tracking start date and dateStr is before it, skip
          if (course?.tracking_start_date && dateStr < course.tracking_start_date) {
            return false;
          }
          const keyWithSlot = `${s.course_id}:${dateStr}:${s.slot_id || ''}`;
          const keyWithoutSlot = `${s.course_id}:${dateStr}:`;
          return !markedSet.has(keyWithSlot) && !markedSet.has(keyWithoutSlot);
        });

        if (dayUnmarked.length > 0) {
          unmarkedDays.push({
            date: dateStr,
            unmarkedSlots: dayUnmarked,
          });
          totalUnmarkedClasses += dayUnmarked.reduce((acc, s) => acc + s.weight, 0);
        }
      }

      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  // Reverse so newest unmarked dates show first
  unmarkedDays.reverse();

  // Bulk action handlers per day
  const handleBulkAction = async (item: UnmarkedDayItem, status: AttendanceStatus) => {
    setProcessingDate(item.date);
    try {
      const globalLabRule = getLabAttendanceRule();
      for (const slot of item.unmarkedSlots) {
        const course = courseMap.get(slot.course_id);
        const attWeight = resolveSlotAttendanceWeight(slot, course, globalLabRule);
        await markAttendance({
          course_id: slot.course_id,
          date: item.date,
          slot_id: slot.slot_id,
          status,
          weight: attWeight,
          component_type: slot.component_type || course?.type,
        });
      }
      onCatchUpDone?.();
    } finally {
      setProcessingDate(null);
    }
  };

  const handleMarkDayHoliday = async (date: string) => {
    setProcessingDate(date);
    try {
      await createCalendarEvent({
        date,
        type: 'holiday',
        note: 'Holiday',
      });
      onCatchUpDone?.();
    } finally {
      setProcessingDate(null);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Catch Up Unmarked Classes"
      description="Mark past classes in bulk to keep your attendance statistics up to date"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Banner */}
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-800/60 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              {totalUnmarkedClasses} Unmarked Periods Across {unmarkedDays.length} Days
            </h4>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
              Unmarked classes are excluded from conducted totals until you mark them.
            </p>
          </div>
        </div>

        {/* Days List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {unmarkedDays.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                All Caught Up!
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                You have marked all scheduled classes up to today.
              </p>
            </div>
          ) : (
            unmarkedDays.map(item => {
              const isProcessing = processingDate === item.date;

              return (
                <div
                  key={item.date}
                  className="p-4 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {item.date}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                        {item.unmarkedSlots.length} classes
                      </span>
                    </div>

                    {/* Unmarked courses pills */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {item.unmarkedSlots.map((s, idx) => {
                        const course = courseMap.get(s.course_id);
                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600"
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: course?.color || '#6366f1' }}
                            />
                            {course?.name || 'Class'}
                            {s.weight > 1 && (
                              <span className="text-[9px] font-mono text-amber-500 font-bold">
                                ({s.weight}p)
                              </span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bulk Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleBulkAction(item, 'present')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors min-h-[38px] disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      All Present
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleBulkAction(item, 'absent')}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors min-h-[38px] disabled:opacity-50"
                    >
                      <X className="w-3.5 h-3.5" />
                      All Absent
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleBulkAction(item, 'cancelled')}
                      className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors min-h-[38px] disabled:opacity-50"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancelled
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleMarkDayHoliday(item.date)}
                      className="p-2 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                      title="Mark Whole Day as Holiday"
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
};

