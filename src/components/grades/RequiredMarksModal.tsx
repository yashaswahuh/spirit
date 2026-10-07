import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { Course, GradingScheme, AssessmentComponent, Mark, GradeScaleEntry } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { calculateCourseMarks } from '../../engine/marks';
import { calculateRequiredEndSemMarks } from '../../engine/required-marks';

interface RequiredMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  initialCourseId?: string | null;
  allComponents: AssessmentComponent[];
  allMarks: Mark[];
  gradingScheme: GradingScheme | null;
}

export const RequiredMarksModal: React.FC<RequiredMarksModalProps> = ({
  isOpen,
  onClose,
  courses,
  initialCourseId,
  allComponents,
  allMarks,
  gradingScheme,
}) => {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || courses[0]?.id || ''
  );
  const [targetType, setTargetType] = useState<'grade' | 'percentage'>('grade');
  const [selectedGrade, setSelectedGrade] = useState<string>('A');
  const [targetPercentage, setTargetPercentage] = useState<number>(75);

  useEffect(() => {
    if (initialCourseId) {
      setSelectedCourseId(initialCourseId);
    } else if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id);
    }
  }, [initialCourseId, courses]);

  const course = courses.find(c => c.id === selectedCourseId) || courses[0];
  if (!course) return null;

  const defaultScale: GradeScaleEntry[] = [
    { letter: 'O', points: 10, min_percentage: 90, max_percentage: 100 },
    { letter: 'A+', points: 9, min_percentage: 80, max_percentage: 89.99 },
    { letter: 'A', points: 8, min_percentage: 70, max_percentage: 79.99 },
    { letter: 'B+', points: 7, min_percentage: 60, max_percentage: 69.99 },
    { letter: 'B', points: 6, min_percentage: 55, max_percentage: 59.99 },
    { letter: 'C', points: 5, min_percentage: 50, max_percentage: 54.99 },
    { letter: 'P', points: 4, min_percentage: 40, max_percentage: 49.99 },
    { letter: 'F', points: 0, min_percentage: 0, max_percentage: 39.99 },
  ];

  const schemeScale: GradeScaleEntry[] = gradingScheme?.scheme_data?.scale?.length
    ? gradingScheme.scheme_data.scale
    : defaultScale;

  const components = allComponents.filter(c => c.course_id === course.id);
  const marks = allMarks.filter(m => components.some(c => c.id === m.component_id));

  // Identify End-Sem Component vs Internal Components
  const endSemComp = components.find(c => c.is_end_sem) || components[components.length - 1];
  const internalComponents = components.filter(c => c.id !== endSemComp?.id);

  const internalSummary = calculateCourseMarks(internalComponents, marks);
  const endSemMax = endSemComp?.max_marks || 100;
  const endSemWeightage = endSemComp?.weightage || (100 - internalSummary.total_weightage_evaluated) || 60;
  const internalWeightage = 100 - endSemWeightage;
  const minEndSemPassMarks = endSemComp?.min_pass_marks ?? course.min_end_sem_marks ?? 0;

  // Compute effective target percentage
  let effectiveTargetPct = targetPercentage;
  if (targetType === 'grade') {
    const scaleEntry = schemeScale.find(s => s.letter === selectedGrade);
    effectiveTargetPct = scaleEntry?.min_percentage ?? (scaleEntry ? scaleEntry.points * 10 : 70);
  }

  // Calculate required end-sem marks
  const solverResult = calculateRequiredEndSemMarks({
    internal_obtained: internalSummary.total_obtained_marks,
    internal_max: internalSummary.total_max_marks || 1,
    internal_weightage: internalWeightage,
    end_sem_max: endSemMax,
    end_sem_weightage: endSemWeightage,
    target_total_percentage: effectiveTargetPct,
    end_sem_min_pass_marks: minEndSemPassMarks || 0,
  });

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Required Marks Calculator"
      description="Calculate minimum marks needed in remaining assessments or end-sem exam."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Course Picker */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Select Course
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {courses.map(c => {
              const isSelected = c.id === course.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCourseId(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: c.color || '#6366f1' }}
                  />
                  <span>{c.code || c.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Internal Performance Strip */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Internal Marks Scored
            </span>
            <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              {internalSummary.total_obtained_marks.toFixed(1)} / {internalSummary.total_max_marks.toFixed(1)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Internal Percentage
            </span>
            <span className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {internalSummary.total_max_marks > 0
                ? `${((internalSummary.total_obtained_marks / internalSummary.total_max_marks) * 100).toFixed(1)}%`
                : '0.0%'}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              Internal Weightage
            </span>
            <span className="text-base sm:text-lg font-black text-gray-700 dark:text-gray-300">
              {internalWeightage}% of course
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
              End-Sem Weightage
            </span>
            <span className="text-base sm:text-lg font-black text-gray-700 dark:text-gray-300">
              {endSemWeightage}% (Max {endSemMax})
            </span>
          </div>
        </div>

        {/* Target Goal Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Target Goal
            </label>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setTargetType('grade')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  targetType === 'grade'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Target Letter Grade
              </button>
              <button
                type="button"
                onClick={() => setTargetType('percentage')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  targetType === 'percentage'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-gray-500'
                }`}
              >
                Target Percentage
              </button>
            </div>
          </div>

          {targetType === 'grade' ? (
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {schemeScale
                .filter(s => s.points > 0)
                .map(item => {
                  const isSelected = selectedGrade === item.letter;
                  return (
                    <button
                      key={item.letter}
                      type="button"
                      onClick={() => setSelectedGrade(item.letter)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 font-bold'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-black">{item.letter}</span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {item.min_percentage ? `${item.min_percentage}%` : `${item.points * 10}%`}
                      </span>
                    </button>
                  );
                })}
            </div>
          ) : (
            <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
              <input
                type="range"
                min="40"
                max="100"
                step="1"
                value={targetPercentage}
                onChange={e => setTargetPercentage(parseInt(e.target.value) || 40)}
                className="flex-1 accent-indigo-600 cursor-pointer"
              />
              <span className="text-lg font-black text-gray-900 dark:text-white font-mono w-16 text-right">
                {targetPercentage}%
              </span>
            </div>
          )}
        </div>

        {/* Solver Output Hero Card */}
        <div
          className={`rounded-3xl p-5 sm:p-6 border text-left transition-all ${
            solverResult.is_achievable
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-100'
              : 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/50 text-rose-950 dark:text-rose-100'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {solverResult.is_achievable ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                )}
                <span className="text-xs uppercase font-bold tracking-wider">
                  {solverResult.is_achievable ? 'Target Achievable' : 'Target Mathematically Impossible'}
                </span>
              </div>

              <div className="flex items-baseline gap-2 pt-2">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                  {solverResult.required_raw_marks.toFixed(1)}
                </span>
                <span className="text-sm font-semibold opacity-75">
                  / {endSemMax} marks needed in End-Sem
                </span>
              </div>

              <p className="text-xs pt-1 opacity-80">
                You need a score of {solverResult.required_percentage.toFixed(1)}% in the End-Sem exam to reach {effectiveTargetPct}% total.
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${
                  solverResult.is_achievable
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200'
                }`}
              >
                {solverResult.is_achievable ? 'Realistic Goal' : 'Exceeds 100%'}
              </span>
            </div>
          </div>

          {minEndSemPassMarks > 0 && solverResult.required_raw_marks === minEndSemPassMarks && (
            <div className="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Note: Required marks adjusted up to {minEndSemPassMarks} to meet the university's separate end-sem passing cutoff.</span>
            </div>
          )}

          {!solverResult.is_achievable && (
            <div className="mt-4 pt-3 border-t border-rose-200/60 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-200">
              <span>Even scoring 100% in the end-sem would yield {((internalSummary.total_obtained_marks / (internalSummary.total_max_marks || 1)) * internalWeightage + endSemWeightage).toFixed(1)}%, which is below {effectiveTargetPct}%. Consider a lower target grade.</span>
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
