import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Term } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { startNextSemester } from '../../db/repositories/term.repo';

interface NextSemesterWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTerm: Term | null;
  onTermCreated?: (newTerm: Term) => void;
}

export const NextSemesterWizardModal: React.FC<NextSemesterWizardModalProps> = ({
  isOpen,
  onClose,
  currentTerm,
  onTermCreated,
}) => {
  const nextNum = currentTerm ? currentTerm.number + 1 : 2;
  const today = new Date().toISOString().slice(0, 10);
  const defaultEnd = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [name, setName] = useState(`Semester ${nextNum}`);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [threshold, setThreshold] = useState<number>(currentTerm?.attendance_threshold || 75);
  const [copyCourses, setCopyCourses] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!currentTerm) return null;

  const handleStartSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const newTerm = await startNextSemester({
        currentTermId: currentTerm.id,
        name,
        start_date: startDate,
        end_date: endDate,
        attendance_threshold: threshold,
        copy_courses: copyCourses,
      });

      if (onTermCreated) onTermCreated(newTerm);
      onClose();
    } catch (err) {
      console.error('Failed to start next semester:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Start Next Semester Wizard"
      description={`Finish & freeze ${currentTerm.name} and roll forward to ${name}.`}
      maxWidth="md"
    >
      <form onSubmit={handleStartSemester} className="space-y-6">
        {/* Term Name & Dates */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              New Term / Semester Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Attendance Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={threshold}
              onChange={e => setThreshold(parseInt(e.target.value) || 75)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Copy Courses Option */}
        <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={copyCourses}
              onChange={e => setCopyCourses(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded border-gray-300 dark:border-gray-700"
            />
            <div>
              <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 block">
                Copy course structure from {currentTerm.name}
              </span>
              <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
                Copies course names, credits, and types so you don't have to enter them from scratch. Attendance and marks reset to 0 for the new term.
              </span>
            </div>
          </label>
        </div>

        {/* Lock Notice */}
        <div className="text-[11px] text-gray-500 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
          <span>
            Finishing {currentTerm.name} will compute and freeze its final SGPA and archive its timetable. You can always view past semesters in the term manager.
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Starting...' : 'Roll Forward & Launch'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
