import React, { useState, useEffect } from 'react';
import { Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Course, GradeResult, GradingScheme, AssessmentComponent, Mark, GradeScaleEntry } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { saveGradeResult } from '../../db/repositories/assessment.repo';
import { calculateCourseMarks, deriveGradeFromMarks, checkCourseEligibility } from '../../engine/marks';

interface FinalGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  termId?: string | null;
  existingResult?: GradeResult | null;
  components?: AssessmentComponent[];
  marks?: Mark[];
  gradingScheme?: GradingScheme | null;
  currentAttendancePct?: number | null;
  onSaved?: () => void;
}

export const FinalGradeModal: React.FC<FinalGradeModalProps> = ({
  isOpen,
  onClose,
  course,
  termId,
  existingResult,
  components = [],
  marks = [],
  gradingScheme,
  currentAttendancePct,
  onSaved,
}) => {
  const [letterGrade, setLetterGrade] = useState<string>('');
  const [gradePoints, setGradePoints] = useState<string>('');
  const [isPassing, setIsPassing] = useState<boolean>(true);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [derivedNote, setDerivedNote] = useState<string | null>(null);

  useEffect(() => {
    if (existingResult) {
      setLetterGrade(existingResult.letter_grade || '');
      setGradePoints(existingResult.grade_points !== null ? String(existingResult.grade_points) : '');
      setIsPassing(existingResult.is_passing);
      setAttemptNumber(existingResult.attempt_number || 1);
    } else {
      setLetterGrade('');
      setGradePoints('');
      setIsPassing(true);
      setAttemptNumber(1);
    }
    setDerivedNote(null);
  }, [existingResult, course, isOpen]);

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

  const passMark = gradingScheme?.scheme_data?.pass_mark ?? 40;

  const handleSelectGrade = (letter: string, points: number | null, passing: boolean) => {
    setLetterGrade(letter);
    setGradePoints(points !== null ? String(points) : '');
    setIsPassing(passing);
  };

  const handleDeriveFromMarks = () => {
    if (components.length === 0) {
      setDerivedNote('No assessment components defined for this course.');
      return;
    }

    const marksSummary = calculateCourseMarks(components, marks);
    if (marksSummary.total_weightage_evaluated === 0) {
      setDerivedNote('No marks have been recorded yet to derive a grade.');
      return;
    }

    const scorePct = marksSummary.total_max_marks > 0
      ? (marksSummary.total_obtained_marks / marksSummary.total_max_marks) * 100
      : 0;

    const derived = deriveGradeFromMarks(
      scorePct,
      schemeScale,
      passMark
    );

    if (derived) {
      setLetterGrade(derived.letter);
      setGradePoints(String(derived.points));
      setIsPassing(derived.is_passing);
      setDerivedNote(
        `Derived ${derived.letter} (${derived.points} pts) from marks: ${scorePct.toFixed(1)}% (${marksSummary.total_obtained_marks.toFixed(1)}/${marksSummary.total_max_marks.toFixed(1)} marks).`
      );
    } else {
      setDerivedNote(`Could not derive grade for score ${scorePct.toFixed(1)}%.`);
    }
  };

  // Course Eligibility Check
  const marksSummary = calculateCourseMarks(components, marks);
  const endSemComp = components.find(c => c.is_end_sem);
  const endSemMark = endSemComp ? marks.find(m => m.component_id === endSemComp.id) : undefined;
  const endSemObtained = endSemMark?.status === 'entered' ? endSemMark.obtained_marks : null;
  const internalObtained = marksSummary.total_obtained_marks - (endSemObtained || 0);

  const eligibility = checkCourseEligibility({
    attendancePercentage: currentAttendancePct ?? 100,
    attendanceThreshold: course.attendance_threshold_override || 75,
    internalObtained,
    minInternalRequired: course.min_internal_marks,
    endSemObtained,
    minEndSemRequired: course.min_end_sem_marks,
    overallPercentage: marksSummary.total_max_marks > 0 ? (marksSummary.total_obtained_marks / marksSummary.total_max_marks) * 100 : null,
    passMark: course.pass_marks ?? passMark,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const parsedPoints = gradePoints.trim() !== '' ? parseFloat(gradePoints) : null;
      await saveGradeResult(course.id, {
        letter_grade: letterGrade.trim().toUpperCase() || null,
        grade_points: parsedPoints,
        attempt_number: attemptNumber,
        is_passing: isPassing,
        term_id: termId || course.term_id,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save grade result:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Final Grade • ${course.name}`}
      description="Record university letter grade, relative grade, or backlog attempt."
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Course Info & Eligibility Flags */}
        <div className="bg-gray-50 dark:bg-gray-800/60 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {course.code || 'Course'} • {course.credits} Credits • {course.counts_toward_gpa ? 'GPA Course' : 'Audit / Non-Credit'}
            </span>
            <span className="font-mono text-gray-500">
              Attempt #{attemptNumber}
            </span>
          </div>

          {eligibility.reasons.length > 0 && (
            <div className="mt-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Eligibility Issues Flagged:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px]">
                {eligibility.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Derive from Marks Shortcut */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
          <div className="text-xs">
            <span className="font-bold text-indigo-950 dark:text-indigo-200 block">
              Derive Grade from Recorded Marks
            </span>
            <span className="text-[11px] text-indigo-700 dark:text-indigo-300">
              Calculates percentage and maps to your grading bands.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeriveFromMarks}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
          >
            <Calculator className="w-3.5 h-3.5" />
            Derive from Marks
          </button>
        </div>

        {derivedNote && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium px-1">
            {derivedNote}
          </p>
        )}

        {/* Quick Pick Standard Grades */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Standard Letter Grades
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {schemeScale.map((item) => {
              const isSelected = letterGrade === item.letter;
              return (
                <button
                  key={item.letter}
                  type="button"
                  onClick={() => handleSelectGrade(item.letter, item.points, item.points > 0)}
                  className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/20 font-bold'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-black">{item.letter}</span>
                  <span className="text-[10px] opacity-75 font-mono">{item.points} pt</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Special Grades: AB, I, W, Pass, Fail */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            Special Grades (Relative / Incomplete / Status)
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => handleSelectGrade('AB', 0, false)}
              className={`p-2 rounded-xl border text-center transition-all ${
                letterGrade === 'AB'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold">AB (Absent)</div>
              <div className="text-[10px] text-gray-500">0 pts, Backlog</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectGrade('I', null, false)}
              className={`p-2 rounded-xl border text-center transition-all ${
                letterGrade === 'I'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold">I (Incomplete)</div>
              <div className="text-[10px] text-gray-500">Pending grade</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectGrade('W', null, false)}
              className={`p-2 rounded-xl border text-center transition-all ${
                letterGrade === 'W'
                  ? 'border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white font-bold'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold">W (Withdrawn)</div>
              <div className="text-[10px] text-gray-500">Excluded from GPA</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectGrade('P', 4, true)}
              className={`p-2 rounded-xl border text-center transition-all ${
                letterGrade === 'P'
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold">P (Pass Only)</div>
              <div className="text-[10px] text-gray-500">Non-credit/Audit</div>
            </button>
            <button
              type="button"
              onClick={() => handleSelectGrade('F', 0, false)}
              className={`p-2 rounded-xl border text-center transition-all ${
                letterGrade === 'F'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="text-xs font-bold">F (Fail)</div>
              <div className="text-[10px] text-gray-500">0 pts, Arrear</div>
            </button>
          </div>
        </div>

        {/* Manual inputs & Attempt */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Letter Grade
            </label>
            <input
              type="text"
              value={letterGrade}
              onChange={(e) => setLetterGrade(e.target.value.toUpperCase())}
              placeholder="e.g. A+"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Grade Points
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="10"
              value={gradePoints}
              onChange={(e) => setGradePoints(e.target.value)}
              placeholder="e.g. 9.0"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Attempt Number
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="10"
                value={attemptNumber}
                onChange={(e) => setAttemptNumber(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              {attemptNumber > 1 && (
                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded text-[10px] font-bold whitespace-nowrap">
                  Retake / Arrear
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pass Status Checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isPassing}
            onChange={(e) => setIsPassing(e.target.checked)}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-700"
          />
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Course Passed (Credit requirements met)
          </span>
        </label>

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
            disabled={isSubmitting || !letterGrade}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Grade Result'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
