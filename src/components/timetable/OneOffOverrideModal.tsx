import React, { useState, useMemo } from 'react';
import { Ban, RefreshCw, PlusCircle, MoveRight, Clock, Check } from 'lucide-react';
import { Course, TimetableOverride, OneOffOverrideAction, CourseType, PeriodTiming } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { EffectiveSlot } from '../../engine/timetable';
import { getPeriodTimings } from '../../utils/preferences';

interface OneOffOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  daySlots: EffectiveSlot[];
  courses: Course[];
  termId: string;
  periodTimings?: PeriodTiming[];
  onSaveOverride: (data: Omit<TimetableOverride, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<void>;
}

export const OneOffOverrideModal: React.FC<OneOffOverrideModalProps> = ({
  isOpen,
  onClose,
  date,
  daySlots,
  courses,
  termId,
  periodTimings = [],
  onSaveOverride,
}) => {
  const [action, setAction] = useState<OneOffOverrideAction>('cancel');
  const [selectedSlotId, setSelectedSlotId] = useState<string>(daySlots[0]?.slot_id || '');
  const [replacementCourseId, setReplacementCourseId] = useState<string>(courses[0]?.id || '');
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('09:55');
  const [room, setRoom] = useState<string>('');
  const [faculty, setFaculty] = useState<string>('');
  const [weight, setWeight] = useState<number>(1);
  const [componentType, setComponentType] = useState<CourseType>('theory');
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectivePeriodTimings = useMemo<PeriodTiming[]>(() => {
    if (periodTimings && periodTimings.length > 0) {
      return periodTimings;
    }
    const globalDefaults = getPeriodTimings();
    return globalDefaults.map(p => ({
      id: `p-${p.period}`,
      name: p.name,
      start_time: p.startTime,
      end_time: p.endTime,
      is_break: false,
    }));
  }, [periodTimings]);

  const teachingPeriods = useMemo(
    () => effectivePeriodTimings.filter(p => !p.is_break),
    [effectivePeriodTimings]
  );

  const selectedSlot = daySlots.find(s => s.slot_id === selectedSlotId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (action === 'cancel') {
        if (!selectedSlot) return;
        await onSaveOverride({
          term_id: termId,
          date,
          action: 'cancel',
          original_slot_id: selectedSlot.slot_id,
          course_id: selectedSlot.course_id,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          room: selectedSlot.room,
          faculty: selectedSlot.faculty,
          component_type: selectedSlot.component_type,
          weight: selectedSlot.weight,
          note: note.trim() || 'Class cancelled',
        });
      } else if (action === 'substitute') {
        if (!selectedSlot) return;
        const subCourse = courses.find(c => c.id === replacementCourseId);
        await onSaveOverride({
          term_id: termId,
          date,
          action: 'substitute',
          original_slot_id: selectedSlot.slot_id,
          course_id: replacementCourseId,
          start_time: selectedSlot.start_time,
          end_time: selectedSlot.end_time,
          room: room.trim() || selectedSlot.room,
          faculty: faculty.trim() || null,
          component_type: subCourse?.type || selectedSlot.component_type,
          weight: selectedSlot.weight,
          note: note.trim() || 'Substituted class',
        });
      } else if (action === 'reschedule') {
        if (!selectedSlot) return;
        await onSaveOverride({
          term_id: termId,
          date,
          action: 'reschedule',
          original_slot_id: selectedSlot.slot_id,
          course_id: selectedSlot.course_id,
          start_time: startTime,
          end_time: endTime,
          room: room.trim() || selectedSlot.room,
          faculty: selectedSlot.faculty,
          component_type: selectedSlot.component_type,
          weight: selectedSlot.weight,
          note: note.trim() || 'Rescheduled class',
        });
      } else if (action === 'extra') {
        await onSaveOverride({
          term_id: termId,
          date,
          action: 'extra',
          original_slot_id: null,
          course_id: replacementCourseId,
          start_time: startTime,
          end_time: endTime,
          room: room.trim() || null,
          faculty: faculty.trim() || null,
          component_type: componentType,
          weight: Math.max(1, weight),
          note: note.trim() || 'Extra class',
        });
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="One-Off Class Change"
      description={`Apply single-day adjustments for ${date} without changing recurring timetable`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Action Type Tabs */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
            Change Action *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => setAction('cancel')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all min-h-[44px] ${
                action === 'cancel'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
              }`}
            >
              <Ban className="w-4 h-4 text-rose-500" />
              Cancel Class
            </button>

            <button
              type="button"
              onClick={() => setAction('substitute')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all min-h-[44px] ${
                action === 'substitute'
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
              }`}
            >
              <RefreshCw className="w-4 h-4 text-amber-500" />
              Substitute
            </button>

            <button
              type="button"
              onClick={() => setAction('extra')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all min-h-[44px] ${
                action === 'extra'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-500" />
              Extra Class
            </button>

            <button
              type="button"
              onClick={() => setAction('reschedule')}
              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-bold transition-all min-h-[44px] ${
                action === 'reschedule'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
              }`}
            >
              <MoveRight className="w-4 h-4 text-indigo-500" />
              Reschedule
            </button>
          </div>
        </div>

        {/* Target Slot (for Cancel, Substitute, Reschedule) */}
        {action !== 'extra' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Select Scheduled Class to Modify *
            </label>
            {daySlots.length === 0 ? (
              <p className="text-xs text-rose-500 font-semibold p-2 bg-rose-50 dark:bg-rose-950/30 rounded-xl">
                No regular classes scheduled on this day to modify. Choose "Extra Class" to add one.
              </p>
            ) : (
              <select
                value={selectedSlotId}
                onChange={e => setSelectedSlotId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                required
              >
                {daySlots.map(s => {
                  const course = courses.find(c => c.id === s.course_id);
                  return (
                    <option key={s.slot_id || s.start_time} value={s.slot_id || ''}>
                      {s.start_time} - {s.end_time}: {course?.name || 'Class'} ({s.component_type})
                    </option>
                  );
                })}
              </select>
            )}
          </div>
        )}

        {/* Substitute Course Selection */}
        {action === 'substitute' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Substitute With Subject *
            </label>
            <select
              value={replacementCourseId}
              onChange={e => setReplacementCourseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              required
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || 'NO-CODE'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Extra Class Subject Selection */}
        {action === 'extra' && (
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Subject *
            </label>
            <select
              value={replacementCourseId}
              onChange={e => setReplacementCourseId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              required
            >
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code || 'NO-CODE'})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Reschedule or Extra Class Timings */}
        {(action === 'reschedule' || action === 'extra') && (
          <div className="space-y-2">
            {teachingPeriods.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-500" />
                  Quick Period Timings:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {teachingPeriods.map(p => {
                    const isSelected = p.start_time === startTime;
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => {
                          setStartTime(p.start_time);
                          setEndTime(p.end_time);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 min-h-[36px] ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className="font-bold">{p.name}</span>
                        <span className="opacity-80 font-mono text-[11px]">({p.start_time})</span>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
          </div>
        )}

        {/* Room & Faculty for Extra / Substitute */}
        {(action === 'extra' || action === 'substitute' || action === 'reschedule') && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Room (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Lab 4"
                value={room}
                onChange={e => setRoom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Faculty (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Guest Speaker"
                value={faculty}
                onChange={e => setFaculty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
          </div>
        )}

        {action === 'extra' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Period Weight
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={weight}
                onChange={e => setWeight(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={componentType}
                onChange={e => setComponentType(e.target.value as CourseType)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="theory">Theory</option>
                <option value="lab">Lab</option>
                <option value="tutorial">Tutorial</option>
                <option value="elective">Elective</option>
              </select>
            </div>
          </div>
        )}

        {/* Note / Reason */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Note / Reason (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Teacher on duty leave, Special syllabus revision"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || (action !== 'extra' && daySlots.length === 0)}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm min-h-[44px]"
          >
            {isSubmitting ? 'Saving...' : 'Apply One-Off Change'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};

