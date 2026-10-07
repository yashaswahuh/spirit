import React, { useState, useEffect } from 'react';
import { AlertTriangle, Sparkles } from 'lucide-react';
import { GradingScheme, Term } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { calculateRequiredSgpaForTarget } from '../../engine/gpa';

interface TargetPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCgpa: number;
  completedCredits: number;
  gradingScheme: GradingScheme | null;
  terms: Term[];
  currentTerm: Term | null;
}

export const TargetPlannerModal: React.FC<TargetPlannerModalProps> = ({
  isOpen,
  onClose,
  currentCgpa,
  completedCredits,
  gradingScheme,
  terms,
  currentTerm,
}) => {
  const maxPoint = gradingScheme?.scheme_data?.max_point || 10;
  const currentSemNumber = currentTerm?.number || 1;
  const totalExpectedSemesters = Math.max(8, terms.length);

  const [targetCgpa, setTargetCgpa] = useState<number>(
    Math.min(maxPoint, Math.round((currentCgpa > 0 ? currentCgpa + 0.5 : 8.5) * 10) / 10)
  );
  const [targetSemester, setTargetSemester] = useState<number>(
    Math.min(totalExpectedSemesters, currentSemNumber + 2)
  );
  const [remainingCredits, setRemainingCredits] = useState<number>(40);

  // Update remaining credits automatically when target semester changes
  useEffect(() => {
    const semDifference = Math.max(1, targetSemester - currentSemNumber);
    setRemainingCredits(semDifference * 20); // 20 credits average per semester in India
  }, [targetSemester, currentSemNumber]);

  const plannerResult = calculateRequiredSgpaForTarget(
    {
      currentCgpa,
      completedCredits: Math.max(1, completedCredits),
      targetCgpa,
      remainingCredits,
      maxPoint,
    },
    gradingScheme?.scheme_data?.rounding
  );

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Target CGPA Planner"
      description="Plan the required average SGPA needed in remaining semesters to achieve your goal."
      maxWidth="md"
    >
      <div className="space-y-6">
        {/* Current Standing Card */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Current CGPA
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {currentCgpa.toFixed(2)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Credits Completed
            </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {completedCredits}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Target CGPA Goal (Max {maxPoint})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5.0"
                max={maxPoint}
                step="0.05"
                value={targetCgpa}
                onChange={e => setTargetCgpa(parseFloat(e.target.value) || 7.0)}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <input
                type="number"
                step="0.05"
                min="0"
                max={maxPoint}
                value={targetCgpa}
                onChange={e => setTargetCgpa(parseFloat(e.target.value) || 7.0)}
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono font-bold text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Target by Semester
              </label>
              <select
                value={targetSemester}
                onChange={e => setTargetSemester(parseInt(e.target.value) || (currentSemNumber + 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                {Array.from({ length: 8 }, (_, i) => i + 1)
                  .filter(sem => sem > currentSemNumber)
                  .map(sem => (
                    <option key={sem} value={sem}>
                      Semester {sem} ({sem - currentSemNumber} semester{sem - currentSemNumber > 1 ? 's' : ''} away)
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Estimated Remaining Credits
              </label>
              <input
                type="number"
                min="1"
                max="240"
                value={remainingCredits}
                onChange={e => setRemainingCredits(Math.max(1, parseInt(e.target.value) || 20))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Solver Result Hero */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border text-left transition-all ${
            plannerResult.isAchievable
              ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800/50 text-indigo-950 dark:text-indigo-100'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {plannerResult.isAchievable ? (
                  <Sparkles className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span className="text-xs uppercase font-bold tracking-wider">
                  {plannerResult.isAchievable ? 'Target SGPA Requirement' : 'Goal Out of Reach'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                  {plannerResult.requiredSgpa.toFixed(2)}
                </span>
                <span className="text-sm font-semibold opacity-75">
                  / {maxPoint} average SGPA needed
                </span>
              </div>

              <p className="text-xs pt-1 opacity-80">
                To reach {targetCgpa.toFixed(2)} by Semester {targetSemester}, you must average an SGPA of {plannerResult.requiredSgpa.toFixed(2)} across the next {targetSemester - currentSemNumber} semester(s).
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                  plannerResult.isAchievable
                    ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                }`}
              >
                {plannerResult.isAchievable ? 'Achievable' : 'Impossible'}
              </span>
            </div>
          </div>

          {!plannerResult.isAchievable && plannerResult.reason && (
            <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200">
              <span>{plannerResult.reason}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
