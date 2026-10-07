import React, { useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  PeriodTimingConfig,
  getPeriodTimings,
  setPeriodTimings,
  DEFAULT_PERIOD_TIMINGS,
} from '../../utils/preferences';

interface PeriodTimingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PeriodTimingsModal: React.FC<PeriodTimingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [timings, setTimings] = useState<PeriodTimingConfig[]>(getPeriodTimings);
  const [saved, setSaved] = useState(false);

  const handleUpdate = (index: number, field: keyof PeriodTimingConfig, value: any) => {
    const updated = [...timings];
    updated[index] = { ...updated[index], [field]: value };
    setTimings(updated);
  };

  const handleAdd = () => {
    const nextPeriodNum = timings.length + 1;
    setTimings([
      ...timings,
      {
        period: nextPeriodNum,
        name: `Period ${nextPeriodNum}`,
        startTime: '17:00',
        endTime: '17:55',
      },
    ]);
  };

  const handleRemove = (index: number) => {
    setTimings(timings.filter((_, i) => i !== index));
  };

  const handleResetDefaults = () => {
    setTimings(DEFAULT_PERIOD_TIMINGS);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPeriodTimings(timings);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Period Timings Configuration"
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Configure standard bell schedule slots. These defaults are used when creating new timetable slots.
        </p>

        <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
          {timings.map((item, index) => (
            <div
              key={index}
              className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center flex-shrink-0">
                P{item.period}
              </div>

              <input
                type="text"
                value={item.name}
                onChange={e => handleUpdate(index, 'name', e.target.value)}
                placeholder="Period Name"
                className="flex-1 min-w-[100px] px-2.5 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <input
                  type="time"
                  value={item.startTime}
                  onChange={e => handleUpdate(index, 'startTime', e.target.value)}
                  className="px-2 py-1 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
                <span className="text-xs text-gray-400">-</span>
                <input
                  type="time"
                  value={item.endTime}
                  onChange={e => handleUpdate(index, 'endTime', e.target.value)}
                  className="px-2 py-1 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors rounded-lg"
                title="Remove period"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleAdd}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> Add Period
          </button>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-gray-500 hover:underline"
          >
            Reset to Standard Defaults
          </button>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-white" /> Saved!
              </>
            ) : (
              'Save Timings'
            )}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
