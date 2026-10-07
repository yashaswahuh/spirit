import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Course, TimetableSlot, Weekday, CourseType, PeriodTiming } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { timeToMinutes } from '../../engine/timetable';

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
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
    } else {
      setCourseId(courses[0]?.id || '');
      setWeekday(defaultWeekday);
      setStartTime('09:00');
      setEndTime('09:55');
      setRoom('');
      setFaculty('');
      setComponentType('theory');
      setWeight(1);
      setPeriodName('');
    }
  }, [slot, defaultWeekday, courses, isOpen]);

  // When course changes, adapt default component type
  const handleCourseChange = (id: string) => {
    setCourseId(id);
    const selected = courses.find(c => c.id === id);
    if (selected) {
      setComponentType(selected.type);
      if (selected.type === 'lab') {
        setWeight(2);
      }
    }
  };

  const handleApplyPreset = (timing: PeriodTiming) => {
    setStartTime(timing.start_time);
    setEndTime(timing.end_time);
    setPeriodName(timing.name);
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

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={slot ? 'Edit Class Slot' : 'Add Class Slot'}
      description="Configure recurring weekly class schedule"
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
                {c.name} {c.code ? `(${c.code})` : ''} - {c.type}
              </option>
            ))}
          </select>
        </div>

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
                onClick={() => setWeekday(d.day)}
                className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all ${
                  weekday === d.day
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                {d.label.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Period Timings Quick Presets */}
        {periodTimings.length > 0 && (
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
              Quick Timings:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {periodTimings
                .filter(p => !p.is_break)
                .map(p => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => handleApplyPreset(p)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors"
                  >
                    {p.name} ({p.start_time})
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Start & End Times */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Start Time *
            </label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
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
              onChange={e => setEndTime(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              required
            />
          </div>
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
                onChange={e => setWeight(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {weight > 1 ? `${weight} periods` : '1 period'}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">e.g. 2 or 3 for 2-3 hour lab sessions</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Component Type
            </label>
            <select
              value={componentType}
              onChange={e => setComponentType(e.target.value as CourseType)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
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

