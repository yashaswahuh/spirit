import React, { useState } from 'react';
import { CalendarEventType, Weekday } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface CalendarEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    date: string;
    endDate?: string | null;
    type: CalendarEventType;
    swapTargetWeekday?: Weekday | null;
    note?: string | null;
  }) => Promise<void>;
  defaultDate?: string;
}

const EVENT_TYPES: { type: CalendarEventType; label: string; desc: string }[] = [
  { type: 'holiday', label: 'Holiday', desc: 'No classes conducted (excludes from attendance)' },
  { type: 'swap_day', label: 'Swap Day', desc: 'Follow another weekday’s timetable on this date' },
  { type: 'exam', label: 'Exam Day', desc: 'Mid-sem or semester examinations' },
  { type: 'event', label: 'College Event', desc: 'Fest, sports day, or symposium' },
];

const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Monday' },
  { day: 2, label: 'Tuesday' },
  { day: 3, label: 'Wednesday' },
  { day: 4, label: 'Thursday' },
  { day: 5, label: 'Friday' },
  { day: 6, label: 'Saturday' },
];

export const CalendarEventModal: React.FC<CalendarEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultDate,
}) => {
  const [type, setType] = useState<CalendarEventType>('holiday');
  const [date, setDate] = useState<string>(defaultDate || new Date().toISOString().slice(0, 10));
  const [isRange, setIsRange] = useState<boolean>(false);
  const [endDate, setEndDate] = useState<string>(defaultDate || new Date().toISOString().slice(0, 10));
  const [swapTargetWeekday, setSwapTargetWeekday] = useState<Weekday>(1);
  const [note, setNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        date,
        endDate: isRange && endDate >= date ? endDate : null,
        type,
        swapTargetWeekday: type === 'swap_day' ? swapTargetWeekday : null,
        note: note.trim() || null,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Add Calendar Event / Holiday"
      description="Manage holidays, swap days, exam weeks, and college events"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
            Event Type *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {EVENT_TYPES.map(t => (
              <button
                type="button"
                key={t.type}
                onClick={() => setType(t.type)}
                className={`p-3 rounded-xl border text-left transition-all min-h-[44px] ${
                  type === t.type
                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 text-indigo-900 dark:text-indigo-200'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-bold">{t.label}</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Date / Range */}
        <div className="space-y-2">
          {type !== 'swap_day' && (
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={isRange}
                onChange={e => setIsRange(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              Multi-day Date Range (e.g. Diwali Vacation, Exam Week)
            </label>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {isRange ? 'Start Date *' : 'Date *'}
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                required
              />
            </div>

            {isRange && type !== 'swap_day' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  min={date}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
                  required
                />
              </div>
            )}
          </div>
        </div>

        {/* Swap Target Weekday */}
        {type === 'swap_day' && (
          <div className="p-3 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-2">
            <label className="block text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Timetable Day to Follow on this Date:
            </label>
            <select
              value={swapTargetWeekday}
              onChange={e => setSwapTargetWeekday(parseInt(e.target.value) as Weekday)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              {WEEKDAYS.map(w => (
                <option key={w.day} value={w.day}>
                  Follow {w.label}&apos;s Timetable
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Useful when colleges arrange compensatory classes (e.g. &ldquo;Saturday follows Monday schedule&rdquo;).
            </p>
          </div>
        )}

        {/* Note / Label */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
            Note / Title *
          </label>
          <input
            type="text"
            placeholder="e.g. Dussehra Holiday, Mid-Term Exam 1"
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            required
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
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm min-h-[44px]"
          >
            {isSubmitting ? 'Saving...' : 'Add Event'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
