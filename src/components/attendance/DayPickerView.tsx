import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  Check,
  X,
  Ban,
  Activity,
  Shield,
  Clock,
  RotateCcw,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Sun,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { AttendanceStatus, Course, AttendanceRecord } from '../../types';
import { resolveDaySchedule, DayScheduleResolution } from '../../engine/timetable';
import { markAttendance, deleteAttendanceRecord } from '../../db/repositories/attendance.repo';
import { createCalendarEvent, revertHolidayForDate } from '../../db/repositories/calendar.repo';
import { getLabAttendanceRule } from '../../utils/preferences';

interface DayPickerViewProps {
  onRecordChanged?: () => void;
}

interface LastAction {
  recordId: string;
  previousStatus: AttendanceStatus | null;
  courseId: string;
  date: string;
  slotId: string | null;
  courseName: string;
  statusLabel: string;
}

// Centralised config for status display
const STATUS_CONFIG: Record<
  AttendanceStatus | 'unmarked',
  { label: string; icon: React.ReactNode; badgeCls: string }
> = {
  present: {
    label: 'Present',
    icon: <Check className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls:
      'bg-emerald-600 text-white shadow-xs',
  },
  absent: {
    label: 'Absent',
    icon: <X className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls:
      'bg-rose-600 text-white shadow-xs',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls:
      'bg-amber-600 text-white shadow-xs',
  },
  medical: {
    label: 'Medical',
    icon: <Activity className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls:
      'bg-cyan-600 text-white shadow-xs',
  },
  duty_leave: {
    label: 'Duty Leave',
    icon: <Shield className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls:
      'bg-violet-600 text-white shadow-xs',
  },
  holiday: {
    label: 'Holiday',
    icon: <Sun className="w-3.5 h-3.5" />,
    badgeCls:
      'bg-orange-500 text-white shadow-xs',
  },
  unmarked: {
    label: 'Not marked',
    icon: <HelpCircle className="w-3.5 h-3.5" />,
    badgeCls:
      'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  },
};

const STATUS_BUTTONS: {
  status: AttendanceStatus;
  label: string;
  icon: (cls?: string) => React.ReactNode;
  activeBg: string;
  activeRing: string;
}[] = [
  {
    status: 'present',
    label: 'Present',
    icon: cls => <Check className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-emerald-600 dark:bg-emerald-500 text-white shadow-md',
    activeRing: 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'absent',
    label: 'Absent',
    icon: cls => <X className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-rose-600 dark:bg-rose-500 text-white shadow-md',
    activeRing: 'ring-2 ring-rose-500 dark:ring-rose-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    icon: cls => <Ban className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-amber-600 dark:bg-amber-500 text-white shadow-md',
    activeRing: 'ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'medical',
    label: 'Medical',
    icon: cls => <Activity className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-cyan-600 dark:bg-cyan-500 text-white shadow-md',
    activeRing: 'ring-2 ring-cyan-500 dark:ring-cyan-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'duty_leave',
    label: 'Duty',
    icon: cls => <Shield className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-violet-600 dark:bg-violet-500 text-white shadow-md',
    activeRing: 'ring-2 ring-violet-500 dark:ring-violet-400 ring-offset-2 dark:ring-offset-gray-900',
  },
];

export const DayPickerView: React.FC<DayPickerViewProps> = ({ onRecordChanged }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [lastAction, setLastAction] = useState<LastAction | null>(null);

  // Queries
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const terms = useLiveQuery(() => db.term.filter(t => t.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null && r.date === selectedDate).toArray()) || [];

  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));
  const activeTerm = terms.find(t => t.status === 'ongoing') || terms[0];
  const workingDays = activeTerm?.working_days || [1, 2, 3, 4, 5, 6];
  const globalLabRule = getLabAttendanceRule();

  // Resolve day schedule using engine with active Saturday rules & Lab counting rules
  const daySchedule: DayScheduleResolution = resolveDaySchedule({
    date: selectedDate,
    versions,
    slots,
    calendarEvents,
    overrides,
    workingDays,
    saturdayRule: activeTerm?.saturday_rule,
    courses,
    labAttendanceRule: globalLabRule,
  });

  // Clear undo toast after 6 seconds
  useEffect(() => {
    if (!lastAction) return;
    const timer = setTimeout(() => setLastAction(null), 6000);
    return () => clearTimeout(timer);
  }, [lastAction]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + 1);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().slice(0, 10));
  };

  // Find attendance record for a slot on this day with fallback matching
  const getSlotRecord = (courseId: string, slotId: string | null): AttendanceRecord | undefined => {
    if (slotId) {
      const exact = records.find(r => r.course_id === courseId && r.slot_id === slotId);
      if (exact) return exact;
      // Fallback: if only one slot for this course exists on this day, match records logged with null slot_id
      const courseSlotsOnDay = daySchedule.slots.filter(s => s.course_id === courseId);
      if (courseSlotsOnDay.length === 1) {
        const fallback = records.find(r => r.course_id === courseId && !r.slot_id);
        if (fallback) return fallback;
      }
      return undefined;
    }
    return records.find(r => r.course_id === courseId);
  };

  // One-tap mark or toggle/clear
  // attendanceWeight: how many periods count for attendance
  const handleToggleStatus = async (
    courseId: string,
    slotId: string | null,
    targetStatus: AttendanceStatus,
    attendanceWeight: number = 1
  ) => {
    const existing = getSlotRecord(courseId, slotId);
    const course = courseMap.get(courseId);
    const courseName = course?.name || 'Class';

    if (existing && existing.status === targetStatus) {
      // Tapping again clears the mark!
      await deleteAttendanceRecord(existing.id);
      setLastAction({
        recordId: existing.id,
        previousStatus: targetStatus,
        courseId,
        date: selectedDate,
        slotId,
        courseName,
        statusLabel: 'Cleared',
      });
    } else {
      // Mark or change
      const saved = await markAttendance({
        course_id: courseId,
        date: selectedDate,
        slot_id: slotId,
        status: targetStatus,
      });

      // Synchronize attendance_weight on the record
      await db.attendance_record.update(saved.id, { weight: attendanceWeight });

      setLastAction({
        recordId: saved.id,
        previousStatus: existing ? existing.status : null,
        courseId,
        date: selectedDate,
        slotId,
        courseName,
        statusLabel: targetStatus.toUpperCase(),
      });
    }

    onRecordChanged?.();
  };

  // Undo last action
  const handleUndo = async () => {
    if (!lastAction) return;

    if (lastAction.statusLabel === 'Cleared') {
      // Restore previous record
      if (lastAction.previousStatus) {
        await markAttendance({
          course_id: lastAction.courseId,
          date: lastAction.date,
          slot_id: lastAction.slotId,
          status: lastAction.previousStatus,
        });
      }
    } else if (lastAction.previousStatus) {
      // Revert to old status
      await markAttendance({
        course_id: lastAction.courseId,
        date: lastAction.date,
        slot_id: lastAction.slotId,
        status: lastAction.previousStatus,
      });
    } else {
      // Was freshly created, delete it
      await deleteAttendanceRecord(lastAction.recordId);
    }

    setLastAction(null);
    onRecordChanged?.();
  };

  // Bulk actions — use resolved attendance_weight
  const handleBulkMarkDay = async (status: AttendanceStatus) => {
    for (const slot of daySchedule.slots) {
      const saved = await markAttendance({
        course_id: slot.course_id,
        date: selectedDate,
        slot_id: slot.slot_id,
        status,
      });
      await db.attendance_record.update(saved.id, { weight: slot.attendance_weight });
    }
    onRecordChanged?.();
  };

  const handleMarkWholeDayHoliday = async () => {
    await createCalendarEvent({
      date: selectedDate,
      type: 'holiday',
      note: 'Holiday',
    });
    onRecordChanged?.();
  };

  const handleRevertHoliday = async () => {
    const success = await revertHolidayForDate(selectedDate);
    if (success) {
      onRecordChanged?.();
      setLastAction({
        recordId: 'holiday-revert',
        previousStatus: 'holiday',
        courseId: '',
        date: selectedDate,
        slotId: null,
        courseName: 'Holiday',
        statusLabel: 'Reverted holiday. Regular timetable restored!',
      });
    }
  };

  const isToday = selectedDate === new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      {/* Date Navigation Bar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-3.5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevDay}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Previous Day"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm font-mono font-bold text-gray-900 dark:text-white"
            />
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Next Day"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Today
            </button>
          )}
        </div>

        {/* Day Status Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          {daySchedule.is_holiday ? (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs font-bold">
                <Sun className="w-3.5 h-3.5" />
                {daySchedule.holiday_note || 'Holiday'} (No classes)
              </span>
              <button
                type="button"
                onClick={handleRevertHoliday}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-gray-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors min-h-[30px]"
                title="Revert holiday if marked by mistake"
              >
                <RotateCcw className="w-3 h-3" />
                Revert
              </button>
            </div>
          ) : daySchedule.is_swap_day ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
              Swap Day (Following Day {daySchedule.effective_weekday} schedule)
            </span>
          ) : !daySchedule.is_working_day ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-bold">
              Non-Working Day / Weekly Off
            </span>
          ) : (
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 font-mono">
              {daySchedule.slots.length} classes scheduled ({daySchedule.total_periods} periods)
            </span>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {daySchedule.slots.length > 0 && !daySchedule.is_holiday && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
            <CheckCheck className="w-4 h-4 text-indigo-500" />
            Bulk Day Actions:
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleBulkMarkDay('present')}
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors min-h-[36px]"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkDay('absent')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors min-h-[36px]"
            >
              All Absent
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkDay('cancelled')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors min-h-[36px]"
            >
              All Cancelled
            </button>
            <button
              type="button"
              onClick={handleMarkWholeDayHoliday}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors min-h-[36px]"
            >
              Mark Holiday
            </button>
          </div>
        </div>
      )}

      {/* Slots List for Selected Date */}
      <div className="space-y-3">
        {daySchedule.is_holiday ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-2">
            <Sun className="w-10 h-10 text-amber-500 mx-auto" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {daySchedule.holiday_note || 'College Holiday'}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              No classes are conducted on holidays. They are excluded from your attendance denominator.
            </p>
            <div className="pt-3">
              <button
                type="button"
                onClick={handleRevertHoliday}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors min-h-[38px] shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Marked by mistake? Revert Holiday &amp; Restore Classes
              </button>
            </div>
          </div>
        ) : daySchedule.slots.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 text-sm text-gray-500">
            No classes scheduled for {selectedDate}.
          </div>
        ) : (
          daySchedule.slots.map(slot => {
            const course = courseMap.get(slot.course_id);
            const record = getSlotRecord(slot.course_id, slot.slot_id);
            const status = record?.status;
            const statusKey = status ?? 'unmarked';
            const statusCfg = STATUS_CONFIG[statusKey];
            const isMarked = status !== undefined && status !== null;

            // Show attendance_weight note when it differs from the time-spanning weight
            const showWeightNote = slot.attendance_weight !== slot.weight;

            const cardBorderCls =
              status === 'present'
                ? 'border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-emerald-500/5'
                : status === 'absent'
                ? 'border-rose-300 dark:border-rose-700/80 bg-rose-50/20 dark:bg-rose-950/10 shadow-rose-500/5'
                : status === 'cancelled'
                ? 'border-amber-300 dark:border-amber-700/80 bg-amber-50/20 dark:bg-amber-950/10 shadow-amber-500/5'
                : status === 'medical'
                ? 'border-cyan-300 dark:border-cyan-700/80 bg-cyan-50/20 dark:bg-cyan-950/10 shadow-cyan-500/5'
                : status === 'duty_leave'
                ? 'border-violet-300 dark:border-violet-700/80 bg-violet-50/20 dark:bg-violet-950/10 shadow-violet-500/5'
                : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900';

            return (
              <div
                key={slot.slot_id || `${slot.course_id}-${slot.start_time}`}
                className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col gap-3 ${cardBorderCls}`}
              >
                {/* Top row: class info + current status badge */}
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-11 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course?.color || '#6366f1' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                          {course?.name || 'Class'}
                        </h4>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase">
                          {slot.component_type}
                        </span>
                        {slot.weight > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                            {slot.weight} periods
                          </span>
                        )}
                        {showWeightNote && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                            Counts as {slot.attendance_weight}
                          </span>
                        )}
                        {slot.is_override && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {slot.override_action}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-mono">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-indigo-500" />
                          {slot.start_time} - {slot.end_time}
                        </span>
                        {slot.room && <span>• {slot.room}</span>}
                        {(slot.faculty || course?.faculty) && <span>• {slot.faculty || course?.faculty}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Current status badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black flex-shrink-0 ${statusCfg.badgeCls}`}
                    aria-label={`Status: ${statusCfg.label}`}
                  >
                    {statusCfg.icon}
                    <span>{statusCfg.label}</span>
                  </span>
                </div>

                {/* Status Indicator Banner */}
                {isMarked ? (
                  <div
                    className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-medium ${
                      status === 'present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                        : status === 'absent'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                        : status === 'cancelled'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                        : status === 'medical'
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800/60 text-cyan-900 dark:text-cyan-200'
                        : 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800/60 text-violet-900 dark:text-violet-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold flex items-center gap-1.5">
                        {statusCfg.icon}
                        Marked: <span className="uppercase font-black">{statusCfg.label}</span>
                      </span>
                      {slot.attendance_weight > 1 ? (
                        <span className="text-[11px] opacity-80">
                          (awards +{slot.attendance_weight} attendance)
                        </span>
                      ) : slot.weight > 1 && slot.attendance_weight === 1 ? (
                        <span className="text-[11px] opacity-80">
                          (spans {slot.weight} periods, counted as 1 attendance)
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(slot.course_id, slot.slot_id, status, slot.attendance_weight)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold underline opacity-80 hover:opacity-100 transition-opacity ml-2 whitespace-nowrap cursor-pointer"
                      title="Clear attendance mark"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      Not marked yet — tap an option below:
                    </span>
                  </div>
                )}

                {/* Status action buttons */}
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  {STATUS_BUTTONS.map(btn => {
                    const isSelected = status === btn.status;
                    return (
                      <button
                        key={btn.status}
                        type="button"
                        onClick={() =>
                          handleToggleStatus(
                            slot.course_id,
                            slot.slot_id,
                            btn.status,
                            slot.attendance_weight
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer ${
                          isSelected
                            ? `${btn.activeBg} ${btn.activeRing} scale-[1.02]`
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/90 dark:border-gray-700 hover:bg-gray-200/70 dark:hover:bg-gray-700 active:scale-95'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`${btn.label} - ${isSelected ? 'Selected' : 'Not Selected'}`}
                      >
                        {btn.icon(isSelected ? 'w-4 h-4 stroke-[2.5]' : 'w-4 h-4 text-gray-500 dark:text-gray-400')}
                        <span>{btn.label}</span>
                        {isSelected && (
                          <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-white/25 text-[10px] font-black uppercase tracking-wider">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Undo Toast */}
      {lastAction && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-gray-900 text-white text-xs font-bold shadow-2xl flex items-center gap-3 border border-gray-700 animate-slide-up">
          <AlertCircle className="w-4 h-4 text-indigo-400" />
          <span>
            {lastAction.courseName}: {lastAction.statusLabel}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors ml-2"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
