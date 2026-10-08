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
  Sliders,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { AttendanceStatus, Course, AttendanceRecord } from '../../types';
import { resolveDaySchedule, DayScheduleResolution, timeToMinutes } from '../../engine/timetable';
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
    badgeCls: 'bg-emerald-600 text-white shadow-xs',
  },
  absent: {
    label: 'Absent',
    icon: <X className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls: 'bg-rose-600 text-white shadow-xs',
  },
  cancelled: {
    label: 'Cancelled',
    icon: <Ban className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls: 'bg-amber-600 text-white shadow-xs',
  },
  medical: {
    label: 'Medical',
    icon: <Activity className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls: 'bg-cyan-600 text-white shadow-xs',
  },
  duty_leave: {
    label: 'Duty Leave',
    icon: <Shield className="w-3.5 h-3.5 stroke-[2.5]" />,
    badgeCls: 'bg-violet-600 text-white shadow-xs',
  },
  holiday: {
    label: 'Holiday',
    icon: <Sun className="w-3.5 h-3.5" />,
    badgeCls: 'bg-orange-500 text-white shadow-xs',
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
    activeBg: 'bg-emerald-600 dark:bg-emerald-600 text-white shadow-md',
    activeRing: 'ring-2 ring-emerald-500 dark:ring-emerald-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'absent',
    label: 'Absent',
    icon: cls => <X className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-rose-600 dark:bg-rose-600 text-white shadow-md',
    activeRing: 'ring-2 ring-rose-500 dark:ring-rose-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'cancelled',
    label: 'Cancelled',
    icon: cls => <Ban className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-amber-600 dark:bg-amber-600 text-white shadow-md',
    activeRing: 'ring-2 ring-amber-500 dark:ring-amber-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'medical',
    label: 'Medical',
    icon: cls => <Activity className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-cyan-600 dark:bg-cyan-600 text-white shadow-md',
    activeRing: 'ring-2 ring-cyan-500 dark:ring-cyan-400 ring-offset-2 dark:ring-offset-gray-900',
  },
  {
    status: 'duty_leave',
    label: 'Duty',
    icon: cls => <Shield className={cls || 'w-4 h-4 stroke-[2.5]'} />,
    activeBg: 'bg-violet-600 dark:bg-violet-600 text-white shadow-md',
    activeRing: 'ring-2 ring-violet-500 dark:ring-violet-400 ring-offset-2 dark:ring-offset-gray-900',
  },
];

export const DayPickerView: React.FC<DayPickerViewProps> = ({ onRecordChanged }) => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [lastAction, setLastAction] = useState<LastAction | null>(null);
  // Track custom chosen attendance points per slot (key: slot_id || course_id)
  const [slotCustomWeights, setSlotCustomWeights] = useState<Record<string, number>>({});

  // Queries - explicitly passing [selectedDate] dependency ensures live updates on date change
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const terms = useLiveQuery(() => db.term.filter(t => t.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(
    () =>
      db.attendance_record
        .where('date')
        .equals(selectedDate)
        .filter(r => r.deleted_at === null)
        .toArray(),
    [selectedDate]
  ) || [];

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

  // Resolve the effective attendance weight for a slot
  const getSlotEffectiveWeight = (
    courseId: string,
    slotId: string | null,
    defaultAttWeight: number,
    existingRecord?: AttendanceRecord
  ): number => {
    const key = slotId || courseId;
    if (slotCustomWeights[key] !== undefined) {
      return slotCustomWeights[key];
    }
    const course = courseMap.get(courseId);
    const effectiveRule = course?.lab_attendance_rule || globalLabRule;
    if (effectiveRule === 'single_session') {
      return 1;
    }
    if (existingRecord?.weight && existingRecord.weight > 0) {
      return existingRecord.weight;
    }
    return defaultAttWeight;
  };

  // Update attendance weight for a slot (either in record or local staging)
  const handleSetSlotWeight = async (
    courseId: string,
    slotId: string | null,
    newWeight: number,
    existingRecord?: AttendanceRecord
  ) => {
    const key = slotId || courseId;
    setSlotCustomWeights(prev => ({ ...prev, [key]: newWeight }));
    if (existingRecord) {
      await db.attendance_record.update(existingRecord.id, { weight: newWeight });
      onRecordChanged?.();
    }
  };

  // One-tap mark or toggle/clear
  const handleToggleStatus = async (
    courseId: string,
    slotId: string | null,
    targetStatus: AttendanceStatus,
    attendanceWeight: number = 1
  ) => {
    const existing = getSlotRecord(courseId, slotId);
    const course = courseMap.get(courseId);
    const slot = slotId ? daySchedule.slots.find(s => s.slot_id === slotId) : undefined;
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
      // Mark or update status
      const saved = await markAttendance({
        course_id: courseId,
        date: selectedDate,
        slot_id: slotId,
        status: targetStatus,
        weight: attendanceWeight,
        component_type: slot?.component_type || course?.type,
      });

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
      if (lastAction.previousStatus) {
        await markAttendance({
          course_id: lastAction.courseId,
          date: lastAction.date,
          slot_id: lastAction.slotId,
          status: lastAction.previousStatus,
        });
      }
    } else if (lastAction.previousStatus) {
      await markAttendance({
        course_id: lastAction.courseId,
        date: lastAction.date,
        slot_id: lastAction.slotId,
        status: lastAction.previousStatus,
      });
    } else {
      await deleteAttendanceRecord(lastAction.recordId);
    }

    setLastAction(null);
    onRecordChanged?.();
  };

  // Bulk actions — uses each slot's resolved attendance weight
  const handleBulkMarkDay = async (status: AttendanceStatus) => {
    for (const slot of daySchedule.slots) {
      const rec = getSlotRecord(slot.course_id, slot.slot_id);
      const targetWeight = getSlotEffectiveWeight(
        slot.course_id,
        slot.slot_id,
        slot.attendance_weight,
        rec
      );
      await markAttendance({
        course_id: slot.course_id,
        date: selectedDate,
        slot_id: slot.slot_id,
        status,
        weight: targetWeight,
      });
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

  // Compute day summary stats
  const scheduledCount = daySchedule.slots.length;
  let presentCount = 0;
  let presentPoints = 0;
  let absentCount = 0;
  let cancelledCount = 0;
  let unmarkedCount = 0;

  for (const s of daySchedule.slots) {
    const rec = getSlotRecord(s.course_id, s.slot_id);
    const effWeight = getSlotEffectiveWeight(s.course_id, s.slot_id, s.attendance_weight, rec);
    if (!rec || !rec.status) {
      unmarkedCount++;
    } else if (rec.status === 'present') {
      presentCount++;
      presentPoints += effWeight;
    } else if (rec.status === 'absent') {
      absentCount++;
    } else if (rec.status === 'cancelled') {
      cancelledCount++;
    }
  }

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
              className="px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-gray-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold transition-colors min-h-[30px] cursor-pointer"
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

      {/* Day Attendance Summary Stats Bar */}
      {scheduledCount > 0 && !daySchedule.is_holiday && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <div className="p-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            <div className="min-w-0">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Scheduled</div>
              <div className="text-sm font-black text-gray-900 dark:text-white">
                {scheduledCount} <span className="text-[11px] font-normal text-gray-400">({daySchedule.total_periods} periods)</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="min-w-0">
              <div className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider">Present</div>
              <div className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                {presentCount} <span className="text-[11px] font-bold opacity-80">(+{presentPoints} pts)</span>
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-800/60 flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="min-w-0">
              <div className="text-[10px] text-rose-700 dark:text-rose-400 font-bold uppercase tracking-wider">Absent</div>
              <div className="text-sm font-black text-rose-700 dark:text-rose-300">
                {absentCount}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-2 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="min-w-0">
              <div className="text-[10px] text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wider">Cancelled</div>
              <div className="text-sm font-black text-amber-700 dark:text-amber-300">
                {cancelledCount}
              </div>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 flex items-center gap-2 shadow-xs col-span-2 sm:col-span-1">
            <span className={`w-2.5 h-2.5 rounded-full ${unmarkedCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
            <div className="min-w-0">
              <div className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">Unmarked</div>
              <div className={`text-sm font-black ${unmarkedCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-700 dark:text-gray-300'}`}>
                {unmarkedCount}
              </div>
            </div>
          </div>
        </div>
      )}

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
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-colors min-h-[36px] cursor-pointer"
            >
              All Present
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkDay('absent')}
              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold transition-colors min-h-[36px] cursor-pointer"
            >
              All Absent
            </button>
            <button
              type="button"
              onClick={() => handleBulkMarkDay('cancelled')}
              className="px-2.5 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-700 dark:text-amber-300 text-xs font-bold transition-colors min-h-[36px] cursor-pointer"
            >
              All Cancelled
            </button>
            <button
              type="button"
              onClick={handleMarkWholeDayHoliday}
              className="px-2.5 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-xs font-bold transition-colors min-h-[36px] cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 font-bold text-xs transition-colors min-h-[38px] shadow-xs cursor-pointer"
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

            // Resolve effective weight for this slot
            const effectiveWeight = getSlotEffectiveWeight(
              slot.course_id,
              slot.slot_id,
              slot.attendance_weight,
              record
            );

            // Compute duration and potential multi-period status
            const durationMins = (slot.start_time && slot.end_time)
              ? timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)
              : 0;
            const naturalWeight = slot.weight > 1
              ? slot.weight
              : (durationMins >= 150 ? 3 : (durationMins >= 90 ? 2 : (course?.type === 'lab' || slot.component_type === 'lab' ? 2 : 1)));
            const maxWeight = Math.max(slot.weight, naturalWeight, effectiveWeight);

            // Is this a lab, elective, or multi-period class subject to attendance counting?
            const isMultiPeriodOrRuleApplied =
              slot.weight > 1 ||
              slot.component_type === 'lab' ||
              course?.type === 'lab' ||
              course?.lab_attendance_rule != null ||
              effectiveWeight > 1 ||
              durationMins >= 90;

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
                className={`p-4 rounded-2xl border transition-all shadow-sm flex flex-col gap-3.5 ${cardBorderCls}`}
              >
                {/* Top row: class info + current status badge */}
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-12 rounded-full flex-shrink-0"
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
                            {slot.weight} periods duration
                          </span>
                        )}
                        {slot.is_override && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                            {slot.override_action}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-mono flex-wrap">
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

                {/* Attendance Points Selector for multi-period/lab/elective classes */}
                {isMultiPeriodOrRuleApplied && (
                  <div className="p-3 rounded-xl bg-gray-50/90 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/80 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        <Sliders className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Attendance Counting:</span>
                        {maxWeight > 1 && (
                          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
                            (Spans {maxWeight} periods)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetSlotWeight(slot.course_id, slot.slot_id, 1, record)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            effectiveWeight === 1
                              ? 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-400'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                          }`}
                          title="Count as 1 session (+1 attendance point)"
                        >
                          1 Period (+1)
                        </button>
                        {maxWeight > 1 && (
                          <button
                            type="button"
                            onClick={() => handleSetSlotWeight(slot.course_id, slot.slot_id, maxWeight, record)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              effectiveWeight === maxWeight
                                ? 'bg-indigo-600 text-white shadow-xs font-black ring-2 ring-indigo-400'
                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100'
                            }`}
                            title={`Count as ${maxWeight} periods (+${maxWeight} attendance points)`}
                          >
                            {maxWeight} Periods (+{maxWeight})
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {effectiveWeight === 1
                        ? 'Counted as 1 single session: marking Present will award +1 point to your attendance.'
                        : `Counted as 1 per hour / period: marking Present will award +${effectiveWeight} points to your attendance.`}
                    </p>
                  </div>
                )}

                {/* Status Indicator Banner */}
                {isMarked ? (
                  <div
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs ${
                      status === 'present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 font-bold'
                        : status === 'absent'
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-100 font-bold'
                        : status === 'cancelled'
                        ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-bold'
                        : status === 'medical'
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-100 font-bold'
                        : 'bg-violet-50 dark:bg-violet-950/40 border-violet-300 dark:border-violet-700 text-violet-900 dark:text-violet-100 font-bold'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 font-black uppercase tracking-wide">
                        {statusCfg.icon}
                        Marked: {statusCfg.label}
                      </span>
                      <span className="text-[11px] font-normal opacity-90">
                        {status === 'present'
                          ? `(awards +${effectiveWeight} attendance points)`
                          : status === 'absent'
                          ? `(counted as missed -${effectiveWeight} points)`
                          : status === 'cancelled'
                          ? `(class cancelled, not counted in attendance)`
                          : `(approved leave exemption)`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(slot.course_id, slot.slot_id, status, effectiveWeight)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-gray-800/70 border border-current hover:bg-white dark:hover:bg-gray-800 text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap ml-2 shadow-xs"
                      title="Clear this attendance mark"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Clear mark
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-dashed border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1.5 font-medium">
                      <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                      Not marked yet — tap an option below:
                    </span>
                  </div>
                )}

                {/* Status action buttons with high-contrast active state & check indicators */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
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
                            effectiveWeight
                          )
                        }
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all min-h-[44px] cursor-pointer ${
                          btn.status === 'duty_leave' ? 'col-span-2 sm:col-span-1' : ''
                        } ${
                          isSelected
                            ? `${btn.activeBg} shadow-md`
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'
                        }`}
                        aria-pressed={isSelected}
                        aria-label={`${btn.label} - ${isSelected ? 'Selected (Tap again to clear)' : 'Not Selected'}`}
                        title={isSelected ? `${btn.label} (Tap again to clear)` : `Mark ${btn.label}`}
                      >
                        {btn.icon(isSelected ? 'w-4 h-4 stroke-[2.5]' : 'w-4 h-4 text-gray-400 dark:text-gray-500')}
                        <span>{btn.label}</span>
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
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold transition-colors ml-2 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Undo
          </button>
        </div>
      )}
    </div>
  );
};
