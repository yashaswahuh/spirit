import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Course, CourseType } from '../../types';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    code: string;
    credits: number;
    type: CourseType;
    color: string;
    attendance_threshold_override: number | null;
    medical_counts_as_present: boolean;
    duty_leave_counts_as_present: boolean;
  }) => void;
  initialCourse?: Course;
}

const COLOR_PRESETS = [
  '#6366f1', // Indigo
  '#3b82f6', // Blue
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444', // Red
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCourse,
}) => {
  const [name, setName] = useState(initialCourse?.name || '');
  const [code, setCode] = useState(initialCourse?.code || '');
  const [credits, setCredits] = useState(initialCourse?.credits ?? 4);
  const [type, setType] = useState<CourseType>(initialCourse?.type || 'theory');
  const [color, setColor] = useState(initialCourse?.color || '#6366f1');
  const [thresholdOverride, setThresholdOverride] = useState<string>(
    initialCourse?.attendance_threshold_override?.toString() || ''
  );
  const [medicalCounts, setMedicalCounts] = useState(
    initialCourse?.medical_counts_as_present ?? false
  );
  const [dutyLeaveCounts, setDutyLeaveCounts] = useState(
    initialCourse?.duty_leave_counts_as_present ?? true
  );

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: Number(credits) || 3,
      type,
      color,
      attendance_threshold_override: thresholdOverride ? Number(thresholdOverride) : null,
      medical_counts_as_present: medicalCounts,
      duty_leave_counts_as_present: dutyLeaveCounts,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto p-6 border border-gray-100 dark:border-gray-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialCourse ? 'Edit Subject' : 'Add New Subject'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Operating Systems"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Subject Code
              </label>
              <input
                type="text"
                placeholder="e.g. CS501"
                value={code}
                onChange={e => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Credits
              </label>
              <input
                type="number"
                min="0"
                max="20"
                step="0.5"
                value={credits}
                onChange={e => setCredits(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Course Component Type
              </label>
              <select
                value={type}
                onChange={e => setType(e.target.value as CourseType)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="theory">Theory</option>
                <option value="lab">Laboratory / Practical</option>
                <option value="tutorial">Tutorial</option>
                <option value="project">Project Work</option>
                <option value="elective">Elective</option>
                <option value="audit">Audit (Non-Credit)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Threshold Override % (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Default"
                value={thresholdOverride}
                onChange={e => setThresholdOverride(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {COLOR_PRESETS.map(c => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-indigo-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Attendance Rules
            </label>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Medical leave counts as present
              </span>
              <input
                type="checkbox"
                checked={medicalCounts}
                onChange={e => setMedicalCounts(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Duty / College leave counts as present
              </span>
              <input
                type="checkbox"
                checked={dutyLeaveCounts}
                onChange={e => setDutyLeaveCounts(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md shadow-indigo-200 dark:shadow-none min-h-[44px]"
            >
              {initialCourse ? 'Save Changes' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
