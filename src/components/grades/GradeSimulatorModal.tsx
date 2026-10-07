import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Course, GradingScheme, GradeResult, GradeScaleEntry } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { calculateSgpa, calculateCgpa, CourseAttemptRecord } from '../../engine/gpa';

interface GradeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  existingResults: GradeResult[];
  allGradeResultsAcrossTerms: GradeResult[];
  allCoursesAcrossTerms: Course[];
  gradingScheme: GradingScheme | null;
  entryType?: string;
}

export const GradeSimulatorModal: React.FC<GradeSimulatorModalProps> = ({
  isOpen,
  onClose,
  courses,
  existingResults,
  allGradeResultsAcrossTerms,
  allCoursesAcrossTerms,
  gradingScheme,
  entryType,
}) => {
  // Map courseId -> simulated grade points
  const [simulatedPoints, setSimulatedPoints] = useState<Record<string, number>>({});

  const defaultScale: GradeScaleEntry[] = [
    { letter: 'O', points: 10, min_percentage: 90 },
    { letter: 'A+', points: 9, min_percentage: 80 },
    { letter: 'A', points: 8, min_percentage: 70 },
    { letter: 'B+', points: 7, min_percentage: 60 },
    { letter: 'B', points: 6, min_percentage: 55 },
    { letter: 'C', points: 5, min_percentage: 50 },
    { letter: 'P', points: 4, min_percentage: 40 },
    { letter: 'F', points: 0, min_percentage: 0 },
  ];

  const scale = gradingScheme?.scheme_data?.scale || defaultScale;
  const maxPoint = gradingScheme?.scheme_data?.max_point || 10;

  // Initialize simulation with existing results or defaults
  useEffect(() => {
    const initial: Record<string, number> = {};
    for (const c of courses) {
      const recorded = existingResults.find(r => r.course_id === c.id);
      initial[c.id] = recorded?.grade_points ?? 8.0;
    }
    setSimulatedPoints(initial);
  }, [courses, existingResults, isOpen]);

  // Baseline SGPA (using actually recorded results)
  const baselineInputs = courses.map(c => {
    const recorded = existingResults.find(r => r.course_id === c.id);
    return {
      credits: c.credits,
      grade_points: recorded?.grade_points ?? null,
      counts_toward_gpa: c.counts_toward_gpa,
      letter_grade: recorded?.letter_grade ?? null,
      is_audit: !c.counts_toward_gpa,
    };
  });
  const baselineSgpa = calculateSgpa(baselineInputs, gradingScheme?.scheme_data?.rounding);

  // Simulated SGPA
  const simulatedInputs = courses.map(c => ({
    credits: c.credits,
    grade_points: simulatedPoints[c.id] ?? 0,
    counts_toward_gpa: c.counts_toward_gpa,
    is_audit: !c.counts_toward_gpa,
  }));
  const simulatedSgpa = calculateSgpa(simulatedInputs, gradingScheme?.scheme_data?.rounding);

  // Simulated CGPA across all terms
  const simulatedAllAttempts: CourseAttemptRecord[] = [];
  // For courses in current term, use simulated points
  for (const c of courses) {
    simulatedAllAttempts.push({
      course_id: c.id,
      credits: c.credits,
      grade_points: simulatedPoints[c.id] ?? 0,
      counts_toward_gpa: c.counts_toward_gpa,
      attempt_number: 1,
    });
  }
  // For other past terms' courses, use their existing grades
  for (const g of allGradeResultsAcrossTerms) {
    if (!courses.some(c => c.id === g.course_id)) {
      const pastCourse = allCoursesAcrossTerms.find(c => c.id === g.course_id);
      if (pastCourse) {
        simulatedAllAttempts.push({
          course_id: pastCourse.id,
          credits: pastCourse.credits,
          grade_points: g.grade_points ?? 0,
          counts_toward_gpa: pastCourse.counts_toward_gpa,
          attempt_number: g.attempt_number,
        });
      }
    }
  }

  const simulatedCgpa = calculateCgpa(simulatedAllAttempts, {
    repeat_handling: gradingScheme?.scheme_data?.repeat_handling || 'replace_old',
    rounding: gradingScheme?.scheme_data?.rounding,
    cgpa_to_percentage: gradingScheme?.scheme_data?.cgpa_to_percentage,
    entry_term: entryType === 'lateral' ? 3 : 1,
  });

  const handleReset = () => {
    const initial: Record<string, number> = {};
    for (const c of courses) {
      const recorded = existingResults.find(r => r.course_id === c.id);
      initial[c.id] = recorded?.grade_points ?? 8.0;
    }
    setSimulatedPoints(initial);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Grade & SGPA Simulator"
      description="Adjust expected course grades to forecast term SGPA and cumulative CGPA."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Comparison Hero Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-5 rounded-3xl shadow-md">
            <span className="text-xs uppercase font-bold tracking-wider text-indigo-200 block">
              Simulated Term SGPA
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl sm:text-5xl font-black tracking-tight">
                {simulatedSgpa.sgpa.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-indigo-200">/ {maxPoint}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-500/40 text-xs flex items-center justify-between text-indigo-100">
              <span>Baseline: {baselineSgpa.sgpa.toFixed(2)}</span>
              <span className="font-bold">
                {simulatedSgpa.sgpa >= baselineSgpa.sgpa ? `+${(simulatedSgpa.sgpa - baselineSgpa.sgpa).toFixed(2)}` : (simulatedSgpa.sgpa - baselineSgpa.sgpa).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-5 rounded-3xl shadow-sm">
            <span className="text-xs uppercase font-bold tracking-wider text-gray-400 block">
              Predicted Cumulative CGPA
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                {simulatedCgpa.cgpa.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-gray-400">/ {maxPoint}</span>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>{simulatedCgpa.percentage.toFixed(1)}% Percentage Equivalent</span>
              <span>{simulatedCgpa.total_gpa_credits} Total Credits</span>
            </div>
          </div>
        </div>

        {/* Course-by-Course Sliders */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Simulate Course Performance
            </h4>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div className="space-y-3">
            {courses.map(course => {
              const currentVal = simulatedPoints[course.id] ?? 8.0;
              const matchingScale = scale.find(s => s.points === currentVal) || scale.find(s => Math.abs(s.points - currentVal) < 0.5);

              return (
                <div
                  key={course.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 sm:w-1/3">
                    <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                      {course.name}
                    </h5>
                    <p className="text-[11px] text-gray-400 font-mono">
                      {course.code || 'NO-CODE'} • {course.credits} Credits • {course.counts_toward_gpa ? 'GPA' : 'Audit'}
                    </p>
                  </div>

                  <div className="flex-1 flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max={maxPoint}
                      step="0.5"
                      value={currentVal}
                      onChange={e =>
                        setSimulatedPoints({
                          ...simulatedPoints,
                          [course.id]: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="flex-1 accent-indigo-600 cursor-pointer"
                    />
                    <div className="w-24 text-right flex items-center justify-end gap-1.5 flex-shrink-0">
                      <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                        {currentVal.toFixed(1)}
                      </span>
                      {matchingScale && (
                        <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold">
                          {matchingScale.letter}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
