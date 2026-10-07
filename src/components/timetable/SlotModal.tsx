import React, { useState, useEffect, useMemo } from 'react';
import { Trash2, AlertTriangle, Clock, Check, CheckCircle2, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { Course, TimetableSlot, Weekday, CourseType, PeriodTiming } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { timeToMinutes, calculateEndTimeForPeriod, findNextAvailablePeriodTiming } from '../../engine/timetable';
import { getPeriodTimings, PeriodTimingConfig } from '../../utils/preferences';

interface SlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<TimetableSlot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  slot?: TimetableSlot | null;
  defaultWeekday: Weekday;
  versionId?: string | null;
  courses: Course[];
  existingSlots: TimetableSlot[];
  periodTimings?: PeriodTiming[];
  workingDays?: Weekday[];
}

const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
  { day: 0, label: 'Sunday' },
];

const COMPONENT_TYPES: { type: CourseType; label: string }[] = [
  { type: 'theory', label: 'Theory' },
  { type: 'lab', label: 'Lab' },
  { type: 'tutorial', label: 'Tutorial' },
  { type: 'project', label: 'Project' },
  { type: 'elective', label: 'Elective' },
  { type: 'audit', label: 'Audit' },
];

export const SlotModal: React.FC<SlotModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  slot,
  defaultWeekday,
  versionId,
  courses,
  existingSlots,
  periodTimings = [],
  workingDays = [1, 2, 3, 4, 5, 6],
}) => {
  const [courseId, setCourseId] = useState<string>(courses[0]?.id || '');
  const [weekday, setWeekday] = useState<Weekday>(defaultWeekday);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('09:55');
  const [room, setRoom] = useState<string>('');
  const [faculty, setFaculty] = useState<string>('');
  const [componentType, setComponentType] = useState<CourseType>('theory');
  const [weight, setWeight] = useState<number>(1);
  const [periodName, setPeriodName] = useState<string>('');
  const [isManualTime, setIsManualTime] = useState<boolean>(false);
  const [showCustomTime, setShowCustomTime] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fallback to global period timings preference if term has none configured
  const effectivePeriodTimings = useMemo<PeriodTiming[]>(() => {
    if (periodTimings && periodTimings.length > 0) {
      return periodTimings;
    }
    const globalDefaults: PeriodTimingConfig[] = getPeriodTimings();
    return globalDefaults.map(p => ({
      id: `p-${p.period}`,
      name: p.name,
      start_time: p.startTime,
      end_time: p.endTime,
      is_break: false,
    }));
  }, [periodTimings]);

  // Non-break teaching periods
  const teachingPeriods = useMemo(
    () => effectivePeriodTimings.filter(p => !p.is_break),
    [effectivePeriodTimings]
  );

  // Computes slot end time given starting timing and period weight
  const computeEndTime = (startTiming: PeriodTiming, w: number): string => {
    return calculateEndTimeForPeriod(startTiming, w, teachingPeriods);
  };

  // Checks whether a period is already scheduled on a specific weekday
  const isPeriodScheduledOnDay = (p: PeriodTiming, day: Weekday): boolean => {
    const pStart = timeToMinutes(p.start_time);
    const pEnd = timeToMinutes(p.end_time);
    return existingSlots.some(s => {
      if (slot && s.id === slot.id) return false;
      if (s.weekday !== day) return false;
      if (versionId && s.version_id && s.version_id !== versionId) return false;
      const sStart = timeToMinutes(s.start_time);
      const sEnd = timeToMinutes(s.end_time);
      return pStart < sEnd && pEnd > sStart;
    });
  };

  // Finds next available (unscheduled) period for a specific weekday
  const getNextAvailablePeriod = (day: Weekday): PeriodTiming | null => {
    const daySlots = existingSlots.filter(
      s => s.weekday === day && (!versionId || !s.version_id || s.version_id === versionId)
    );
    return findNextAvailablePeriodTiming(daySlots, teachingPeriods, slot?.id);
  };

  // Sync state on modal open or slot edit
  useEffect(() => {
    if (!isOpen) return;

    if (slot) {
      setCourseId(slot.course_id);
      setWeekday(slot.weekday);
      setStartTime(slot.start_time);
      setEndTime(slot.end_time);
      setRoom(slot.room || '');
      setFaculty(slot.faculty || '');
      setComponentType(slot.component_type);
      setWeight(slot.weight || 1);
      setPeriodName(slot.period_name || '');

      // Check if current timing matches a standard period
      const matched = teachingPeriods.find(p => p.start_time === slot.start_time);
      const matchesStandard = matched && matched.end_time === slot.end_time;
      setIsManualTime(!matchesStandard);
      setShowCustomTime(!matchesStandard);
    } else {
      // Adding new slot: automatically pick next available period on the selected day
      const initialCourse = courses[0];
      const initialType = initialCourse
        ? initialCourse.type === 'theory_and_lab'
          ? 'theory'
          : initialCourse.type
        : 'theory';
      const initialWeight = initialType === 'lab' ? 2 : 1;

      setCourseId(initialCourse?.id || '');
      setWeekday(defaultWeekday);
      setComponentType(initialType);
      setWeight(initialWeight);
      setRoom('');
      setFaculty('');

      const nextPeriod = getNextAvailablePeriod(defaultWeekday);
      if (nextPeriod) {
        setStartTime(nextPeriod.start_time);
        setEndTime(computeEndTime(nextPeriod, initialWeight));
        setPeriodName(nextPeriod.name);
      } else {
        setStartTime('09:00');
        setEndTime('09:55');
        setPeriodName('');
      }

      setIsManualTime(false);
      setShowCustomTime(false);
    }
  }, [slot, defaultWeekday, courses, isOpen, teachingPeriods]);

  // When weekday changes, auto-sync to next available period on the new day if not manually customized
  const handleWeekdayChange = (newDay: Weekday) => {
    setWeekday(newDay);
    if (!slot && !isManualTime) {
      const nextPeriod = getNextAvailablePeriod(newDay);
      if (nextPeriod) {
        setStartTime(nextPeriod.start_time);
        setEndTime(computeEndTime(nextPeriod, weight));
        setPeriodName(nextPeriod.name);
      }
    }
  };

  // When course changes, adapt default component type & sync timing if needed
  const handleCourseChange = (id: string) => {
    setCourseId(id);
    const selected = courses.find(c => c.id === id);
    if (selected) {
      if (selected.type === 'theory_and_lab') {
        handleSetComponentAndWeight('theory', 1);
      } else {
        handleSetComponentAndWeight(selected.type, selected.type === 'lab' ? 2 : 1);
      }
    }
  };

  // When setting component type and weight, adjust end time according to matched period
  const handleSetComponentAndWeight = (newType: CourseType, newWeight: number) => {
    setComponentType(newType);
    setWeight(newWeight);

    const matched = teachingPeriods.find(p => p.start_time === startTime);
    if (matched && !isManualTime) {
      setEndTime(computeEndTime(matched, newWeight));
    }
  };

  // Quick Preset Selection: sync start/end time and period name immediately
  const handleApplyPreset = (timing: PeriodTiming) => {
    setStartTime(timing.start_time);
    setEndTime(computeEndTime(timing, weight));
    setPeriodName(timing.name);
    setIsManualTime(false);
  };

  // Weight input change handler
  const handleWeightChange = (newWeight: number) => {
    const val = Math.max(1, newWeight);
    setWeight(val);
    const matched = teachingPeriods.find(p => p.start_time === startTime);
    if (matched && !isManualTime) {
      setEndTime(computeEndTime(matched, val));
    }
  };

  // Overlap check
  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const overlappingSlots = existingSlots.filter(s => {
    if (slot && s.id === slot.id) return false;
    if (s.weekday !== weekday) return false;
    if (versionId && s.version_id && s.version_id !== versionId) return false;
    const sStart = timeToMinutes(s.start_time);
    const sEnd = timeToMinutes(s.end_time);
    return startMin < sEnd && endMin > sStart;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    setIsSubmitting(true);
    try {
      await onSave({
        course_id: courseId,
        version_id: versionId || null,
        weekday,
        start_time: startTime,
        end_time: endTime,
        room: room.trim() || null,
        faculty: faculty.trim() || null,
        component_type: componentType,
        weight: Math.max(1, weight),
        period_name: periodName.trim() || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleDays = WEEKDAYS.filter(d => workingDays.includes(d.day) || d.day === weekday);
  const selectedCourse = courses.find(c => c.id === courseId);
  const matchedPeriod = teachingPeriods.find(p => p.start_time === startTime);

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={slot ? 'Edit Class Slot' : 'Add Class Slot'}
      description="Configure weekly recurring class with smart quick timings sync"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Subject Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Subject *
          </label>
          <select
            value={courseId}
            onChange={e => handleCourseChange(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium text-sm focus:ring-2 focus:ring-indigo-500"
            required
          >
            {courses.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.code ? `(${c.code})` : ''} - {c.type === 'theory_and_lab' ? 'Theory + Lab' : c.type}
              </option>
            ))}
          </select>
        </div>

        {/* If selected course is Theory + Lab, provide quick 1-tap Lecture vs Practical selector */}
        {selectedCourse?.type === 'theory_and_lab' && (
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                Integrated Subject: Is this slot a Lecture or Lab?
              </span>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                {componentType === 'lab' ? '🧪 Lab Practical' : '📘 Theory Lecture'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSetComponentAndWeight('theory', 1)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                  componentType === 'theory'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>📘 Theory Lecture</span>
                <span className="text-[10px] opacity-80">(1 period)</span>
              </button>
              <button
                type="button"
                onClick={() => handleSetComponentAndWeight('lab', 2)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
                  componentType === 'lab'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>🧪 Lab Practical</span>
                <span className="text-[10px] opacity-80">(2 periods)</span>
              </button>
            </div>
          </div>
        )}

        {/* Weekday Switcher */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Day of Week *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {visibleDays.map(d => (
              <button
                type="button"
                key={d.day}
                onClick={() => handleWeekdayChange(d.day)}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all min-h-[40px] ${
                  weekday === d.day
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                {d.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Period Timings Quick Presets (Smart Synchronized Grid) */}
        {teachingPeriods.length > 0 && (
          <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Quick Timings & Period Slots
              </label>
              <div className="flex items-center gap-1.5">
                {matchedPeriod && !isManualTime ? (
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Synced to {matchedPeriod.name}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                    Custom Time
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Tap a period to sync times automatically. No manual typing required.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
              {teachingPeriods.map(p => {
                const isSelected = matchedPeriod?.id === p.id && !isManualTime;
                const isScheduled = isPeriodScheduledOnDay(p, weekday);

                return (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between min-h-[50px] ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20'
                        : isScheduled
                        ? 'bg-white/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-300'
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:border-indigo-400 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/30'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : ''}`}>
                        {p.name}
                      </span>
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-white flex-shrink-0" />
                      ) : isScheduled ? (
                        <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          In use
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={`text-[11px] font-mono mt-0.5 ${
                        isSelected ? 'text-indigo-100' : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {p.start_time} - {p.end_time}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Custom / Manual Time Inputs (Accordion Toggle) */}
        <div className="pt-0.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowCustomTime(!showCustomTime)}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 py-1"
            >
              <span>{showCustomTime ? 'Hide custom time inputs' : 'Need custom times? Edit start/end manually'}</span>
              {showCustomTime ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isManualTime && matchedPeriod && (
              <button
                type="button"
                onClick={() => handleApplyPreset(matchedPeriod)}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Reset to {matchedPeriod.name}
              </button>
            )}
          </div>

          {showCustomTime && (
            <div className="mt-2 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 space-y-3 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => {
                      setStartTime(e.target.value);
                      setIsManualTime(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => {
                      setEndTime(e.target.value);
                      setIsManualTime(true);
                    }}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
              <p className="text-[11px] text-gray-400">
                Editing times manually sets custom timing for non-standard schedules.
              </p>
            </div>
          )}
        </div>

        {/* Slot Weight & Component Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Slot Weight (Periods)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="6"
                value={weight}
                onChange={e => handleWeightChange(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {weight > 1 ? `${weight} periods` : '1 period'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">e.g. 2 or 3 for multi-period labs</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Component Type
            </label>
            <select
              value={componentType}
              onChange={e => handleSetComponentAndWeight(e.target.value as CourseType, weight)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            >
              {COMPONENT_TYPES.map(c => (
                <option key={c.type} value={c.type}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Room & Faculty */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Room / Classroom (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Hall 302, Lab 2"
              value={room}
              onChange={e => setRoom(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Faculty / Instructor (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Prof. Ramanujan"
              value={faculty}
              onChange={e => setFaculty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Overlap Warning Banner (Allowed but reported) */}
        {overlappingSlots.length > 0 && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div>
              <p className="font-bold">Slot Overlap Detected</p>
              <p className="text-[11px] opacity-90">
                Overlaps with {overlappingSlots.length} other class(es) on {WEEKDAYS.find(w => w.day === weekday)?.label} ({overlappingSlots.map(s => `${s.start_time}-${s.end_time}`).join(', ')}). Allowed for parallel electives or lab batches.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          {slot && onDelete ? (
            <button
              type="button"
              onClick={() => onDelete(slot.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors min-h-[44px]"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Slot
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all min-h-[44px]"
            >
              {isSubmitting ? 'Saving...' : slot ? 'Update Slot' : 'Add Slot'}
            </button>
          </div>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
