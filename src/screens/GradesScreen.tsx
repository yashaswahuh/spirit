import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  GraduationCap,
  Award,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  BookOpen,
  Edit3,
  AlertCircle,
  TrendingUp,
  Target,
  Calculator,
  Calendar,
} from 'lucide-react';
import { db } from '../db/dexie';
import { Course, GradeResult } from '../types';
import { PageContainer } from '../components/layout/PageContainer';
import { computeCourseAttendanceStats } from '../engine/attendance';
import { getLabAttendanceRule } from '../utils/preferences';
import { calculateCourseMarks, checkCourseEligibility } from '../engine/marks';
import { calculateSgpa, calculateCgpa, CourseAttemptRecord } from '../engine/gpa';
import { CourseMarksModal } from '../components/grades/CourseMarksModal';
import { CourseRulesModal } from '../components/grades/CourseRulesModal';
import { FinalGradeModal } from '../components/grades/FinalGradeModal';
import { GradingSchemeModal } from '../components/grades/GradingSchemeModal';
import { RequiredMarksModal } from '../components/grades/RequiredMarksModal';
import { GradeSimulatorModal } from '../components/grades/GradeSimulatorModal';
import { TargetPlannerModal } from '../components/grades/TargetPlannerModal';
import { TermManagerModal } from '../components/grades/TermManagerModal';
import {
  LazySgpaTrendChart,
  LazyAttendanceThresholdChart,
} from '../components/charts/LazyCharts';

export const GradesScreen: React.FC = () => {
  // Database live queries
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());
  const terms = useLiveQuery(() => db.term.filter(t => t.deleted_at === null).sortBy('number')) || [];
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const allCourses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const allComponents = useLiveQuery(() => db.assessment_component.filter(a => a.deleted_at === null).toArray()) || [];
  const allMarks = useLiveQuery(() => db.mark.filter(m => m.deleted_at === null).toArray()) || [];
  const allGradeResults = useLiveQuery(() => db.grade_result.filter(g => g.deleted_at === null).toArray()) || [];
  const attendanceRecords = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const gradingScheme = useLiveQuery(async () => {
    const prog = await db.program.filter(p => p.deleted_at === null).first();
    if (prog?.grading_scheme_id) {
      const s = await db.grading_scheme.get(prog.grading_scheme_id);
      if (s && s.deleted_at === null) return s;
    }
    return db.grading_scheme.filter(g => g.deleted_at === null).first();
  });

  // Selected term state (defaults to active ongoing term or first term)
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);

  // Modals state
  const [marksModalCourse, setMarksModalCourse] = useState<Course | null>(null);
  const [rulesModalCourse, setRulesModalCourse] = useState<Course | null>(null);
  const [finalGradeCourse, setFinalGradeCourse] = useState<Course | null>(null);
  const [isRequiredMarksOpen, setIsRequiredMarksOpen] = useState(false);
  const [requiredMarksCourseId, setRequiredMarksCourseId] = useState<string | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isPlannerOpen, setIsPlannerOpen] = useState(false);
  const [isTermManagerOpen, setIsTermManagerOpen] = useState(false);
  const [isSchemeModalOpen, setIsSchemeModalOpen] = useState<boolean>(false);

  const currentTerm = terms.find(t => t.id === (selectedTermId || activeTerm?.id)) || activeTerm || terms[0];
  const termCourses = currentTerm ? allCourses.filter(c => c.term_id === currentTerm.id) : allCourses;

  const defaultThreshold = currentTerm?.attendance_threshold || profile?.default_attendance_threshold || 75;

  // Compute attendance stats per course
  const courseAttendanceMap = new Map<string, number>();
  const courseChartStats = termCourses.map(c => {
    const records = attendanceRecords.filter(r => r.course_id === c.id);
    const stats = computeCourseAttendanceStats(
      records,
      {
        medical_counts_as_present: c.medical_counts_as_present,
        duty_leave_counts_as_present: c.duty_leave_counts_as_present,
      },
      c.attendance_threshold_override || defaultThreshold,
      {
        initialAttended: c.initial_attended,
        initialConducted: c.initial_conducted,
        trackingStartDate: c.tracking_start_date,
        courseType: c.type,
        labAttendanceRule: c.lab_attendance_rule,
        globalLabRule: getLabAttendanceRule(),
        saturdayRule: currentTerm?.saturday_rule,
      }
    );
    courseAttendanceMap.set(c.id, stats.percentage);
    return {
      course: c,
      percentage: stats.percentage,
      attended: stats.attended,
      conducted: stats.conducted,
      threshold: c.attendance_threshold_override || defaultThreshold,
      isInDanger: stats.is_in_danger,
      safeBunks: stats.safe_bunks,
      mustAttend: stats.must_attend,
    };
  });

  // Active Term SGPA calculation
  const termCourseInputs = termCourses.map(c => {
    const results = allGradeResults.filter(g => g.course_id === c.id);
    const latestResult = results.sort((a, b) => b.attempt_number - a.attempt_number)[0];
    return {
      credits: c.credits,
      grade_points: latestResult?.grade_points ?? null,
      counts_toward_gpa: c.counts_toward_gpa,
      letter_grade: latestResult?.letter_grade ?? null,
      is_audit: !c.counts_toward_gpa,
    };
  });

  const sgpaResult = calculateSgpa(
    termCourseInputs,
    gradingScheme?.scheme_data?.rounding
  );

  // Cumulative CGPA calculation across all terms
  const allAttemptRecords: CourseAttemptRecord[] = [];
  for (const g of allGradeResults) {
    const course = allCourses.find(c => c.id === g.course_id);
    if (!course) continue;
    const term = terms.find(t => t.id === (g.term_id || course.term_id));
    allAttemptRecords.push({
      course_id: course.id,
      credits: course.credits,
      grade_points: g.grade_points ?? 0.0,
      counts_toward_gpa: course.counts_toward_gpa,
      attempt_number: g.attempt_number,
      term_number: term?.number,
    });
  }

  const cgpaResult = calculateCgpa(allAttemptRecords, {
    repeat_handling: gradingScheme?.scheme_data?.repeat_handling || 'replace_old',
    rounding: gradingScheme?.scheme_data?.rounding,
    cgpa_to_percentage: gradingScheme?.scheme_data?.cgpa_to_percentage,
    entry_term: program?.entry_type === 'lateral' ? 3 : 1,
  });

  // Trend data across terms for the trend chart
  const trendData = terms.map(t => {
    const tCourses = allCourses.filter(c => c.term_id === t.id);
    const tInputs = tCourses.map(c => {
      const results = allGradeResults.filter(g => g.course_id === c.id);
      const latest = results.sort((a, b) => b.attempt_number - a.attempt_number)[0];
      return {
        credits: c.credits,
        grade_points: latest?.grade_points ?? null,
        counts_toward_gpa: c.counts_toward_gpa,
        letter_grade: latest?.letter_grade ?? null,
        is_audit: !c.counts_toward_gpa,
      };
    });
    const termSgpa = t.sgpa !== null && t.sgpa !== undefined
      ? t.sgpa
      : calculateSgpa(tInputs, gradingScheme?.scheme_data?.rounding).sgpa;

    // Cumulative CGPA up to this term
    const pastAttempts = allAttemptRecords.filter(a => a.term_number !== undefined && a.term_number <= t.number);
    const termCgpa = calculateCgpa(pastAttempts, {
      repeat_handling: gradingScheme?.scheme_data?.repeat_handling || 'replace_old',
      rounding: gradingScheme?.scheme_data?.rounding,
      entry_term: program?.entry_type === 'lateral' ? 3 : 1,
    }).cgpa;

    return {
      termName: t.name,
      termNumber: t.number,
      sgpa: termSgpa,
      cgpa: termCgpa,
    };
  });

  // Find active backlogs
  const activeBacklogs: Array<{ course: Course; result: GradeResult }> = [];
  for (const course of allCourses) {
    const results = allGradeResults.filter(g => g.course_id === course.id);
    if (results.length === 0) continue;
    const sortedByAttempt = [...results].sort((a, b) => b.attempt_number - a.attempt_number);
    const latest = sortedByAttempt[0];
    if (!latest.is_passing || latest.letter_grade === 'F' || latest.letter_grade === 'AB') {
      activeBacklogs.push({ course, result: latest });
    }
  }

  // Determine division classification if applicable
  const divisions = gradingScheme?.scheme_data?.division_thresholds || [];
  const matchedDivision = divisions
    .slice()
    .sort((a, b) => b.min_percentage - a.min_percentage)
    .find(d => cgpaResult.percentage >= d.min_percentage);

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in pb-12">
      {/* Header & Planning Tools Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Marks & Grades
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {program?.degree_type || 'Degree'} ({program?.branch_department || 'General'}) •{' '}
            {program?.start_year ? `Batch ${program.start_year}–${program.start_year + (program.duration_years || 4)} (Est. End: ${program.start_year + (program.duration_years || 4)}) • ` : ''}
            {program?.entry_type === 'lateral' ? 'Lateral Entry (Starts Sem 3)' : 'Regular Entry'}
          </p>
        </div>

        {/* Quick Tools Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setRequiredMarksCourseId(null);
              setIsRequiredMarksOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <Target className="w-3.5 h-3.5 text-indigo-600" />
            Required Marks
          </button>

          <button
            type="button"
            onClick={() => setIsSimulatorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Calculator className="w-3.5 h-3.5 text-indigo-600" />
            Simulator
          </button>

          <button
            type="button"
            onClick={() => setIsPlannerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Target CGPA
          </button>

          <button
            type="button"
            onClick={() => setIsTermManagerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
            Terms & Backlogs
          </button>

          <button
            type="button"
            onClick={() => setIsSchemeModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-indigo-600" />
            Scheme & Scale
          </button>
        </div>
      </div>

      {/* Summary Cards: SGPA, CGPA, Backlogs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Term SGPA Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-indigo-200 block">
                {currentTerm?.name || 'Current Term'} SGPA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl sm:text-5xl font-black tracking-tight">
                  {sgpaResult.sgpa.toFixed(2)}
                </span>
                <span className="text-sm text-indigo-200 font-mono">
                  / {gradingScheme?.scheme_data?.max_point || 10}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-white flex-shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-indigo-500/40 flex items-center justify-between text-xs text-indigo-100">
            <span>{sgpaResult.gpa_credits} GPA Credits</span>
            <span>{termCourses.length} Courses</span>
          </div>
        </div>

        {/* Cumulative CGPA Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Cumulative CGPA
              </span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
                  {cgpaResult.cgpa.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 font-mono">
                  / {gradingScheme?.scheme_data?.max_point || 10}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {cgpaResult.percentage > 0 ? `${cgpaResult.percentage.toFixed(1)}% Equiv` : 'No marks yet'}
            </span>
            <span className="text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
              {matchedDivision?.name || `${cgpaResult.total_gpa_credits} Total Credits`}
            </span>
          </div>
        </div>

        {/* Academic Standing / Backlogs */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-gray-500 dark:text-gray-400 block">
                Academic Standing
              </span>
              <div className="mt-2">
                {activeBacklogs.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg sm:text-xl">
                    <CheckCircle2 className="w-6 h-6" />
                    <span>Clear Standing</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg sm:text-xl">
                    <AlertTriangle className="w-6 h-6" />
                    <span>{activeBacklogs.length} Active Backlog{activeBacklogs.length > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
            </div>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              activeBacklogs.length === 0 ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/40 text-rose-600'
            }`}>
              {activeBacklogs.length === 0 ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500">
            {activeBacklogs.length === 0 ? (
              <span>All registered courses passed.</span>
            ) : (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                Retake exams pending for: {activeBacklogs.map(b => b.course.code || b.course.name).join(', ')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Term Switcher Tabs */}
      {terms.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {terms.map(t => {
            const isSelected = (selectedTermId || currentTerm?.id) === t.id;
            const isOngoing = t.status === 'ongoing';
            return (
              <button
                key={t.id}
                onClick={() => setSelectedTermId(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{t.name}</span>
                {isOngoing && (
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Courses List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
            {currentTerm?.name || 'Term'} Courses ({termCourses.length})
          </h3>
        </div>

        {termCourses.length === 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 border border-gray-100 dark:border-gray-800 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              No courses found for this term.
            </p>
            <p className="text-xs text-gray-500">
              Add subjects in the Attendance tab or onboarding wizard to track grades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {termCourses.map(course => {
              const components = allComponents.filter(c => c.course_id === course.id);
              const marks = allMarks.filter(m => components.some(c => c.id === m.component_id));
              const gradeResults = allGradeResults.filter(g => g.course_id === course.id);
              const latestResult = [...gradeResults].sort((a, b) => b.attempt_number - a.attempt_number)[0];

              const attendancePct = courseAttendanceMap.get(course.id) ?? 100;
              const threshold = course.attendance_threshold_override || defaultThreshold;
              const isDetentionRisk = attendancePct < threshold;

              const marksSummary = calculateCourseMarks(components, marks);
              const endSemComp = components.find(c => c.is_end_sem);
              const endSemMark = endSemComp ? marks.find(m => m.component_id === endSemComp.id) : undefined;
              const endSemObt = endSemMark?.status === 'entered' ? endSemMark.obtained_marks : null;
              const internalObt = marksSummary.total_obtained_marks - (endSemObt || 0);

              const eligibility = checkCourseEligibility({
                attendancePercentage: attendancePct,
                attendanceThreshold: threshold,
                internalObtained: internalObt,
                minInternalRequired: course.min_internal_marks,
                endSemObtained: endSemObt,
                minEndSemRequired: course.min_end_sem_marks,
                overallPercentage: marksSummary.total_max_marks > 0 ? (marksSummary.total_obtained_marks / marksSummary.total_max_marks) * 100 : null,
                passMark: course.pass_marks ?? gradingScheme?.scheme_data?.pass_mark ?? 40,
              });

              return (
                <div
                  key={course.id}
                  className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    {/* Top row: Course color, name, code, credits & grade badge */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span
                          className="w-3 h-10 rounded-full flex-shrink-0 mt-0.5"
                          style={{ backgroundColor: course.color || '#6366f1' }}
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                            {course.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-semibold text-gray-500">
                              {course.code || 'NO-CODE'}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500 font-medium">
                              {course.credits} Credits
                            </span>
                            {course.type === 'theory_and_lab' && (
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold">
                                Theory + Lab
                              </span>
                            )}
                            {!course.counts_toward_gpa && (
                              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded text-[10px] font-bold">
                                Audit (No GPA)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Final Grade Pill */}
                      <button
                        type="button"
                        onClick={() => setFinalGradeCourse(course)}
                        className={`px-3 py-1.5 rounded-2xl text-xs font-black flex-shrink-0 transition-all shadow-sm ${
                          latestResult?.letter_grade
                            ? latestResult.is_passing
                              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 border border-transparent'
                        }`}
                      >
                        {latestResult?.letter_grade
                          ? `${latestResult.letter_grade} (${latestResult.grade_points ?? 0} pts)`
                          : '+ Set Grade'}
                      </button>
                    </div>

                    {/* Eligibility & Attendance Warning Badges */}
                    <div className="flex flex-wrap gap-2">
                      {isDetentionRisk && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          Attendance Low ({attendancePct.toFixed(1)}% &lt; {threshold}%)
                        </span>
                      )}

                      {eligibility.reasons.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-[11px] font-bold text-rose-800 dark:text-rose-200">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                          Cutoff Not Met
                        </span>
                      )}

                      {latestResult && latestResult.attempt_number > 1 && (
                        <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded text-[10px] font-bold">
                          Attempt #{latestResult.attempt_number} (Retake)
                        </span>
                      )}
                    </div>

                    {/* Marks Progress Bar */}
                    <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-gray-600 dark:text-gray-400">
                          Continuous Assessment Marks
                        </span>
                        <span className="text-gray-900 dark:text-white font-mono">
                          {marksSummary.total_obtained_marks.toFixed(1)} / {marksSummary.total_max_marks.toFixed(1)}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              marksSummary.total_max_marks > 0
                                ? Math.min(100, (marksSummary.total_obtained_marks / marksSummary.total_max_marks) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>{components.length} components ({marksSummary.total_weightage_evaluated}% weight evaluated)</span>
                        <span>
                          {marksSummary.total_max_marks > 0
                            ? `${((marksSummary.total_obtained_marks / marksSummary.total_max_marks) * 100).toFixed(1)}%`
                            : 'No marks'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Marks Entry, Rules Modal, Set Grade, Required Marks */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRulesModalCourse(course)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        Rules
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRequiredMarksCourseId(course.id);
                          setIsRequiredMarksOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold transition-colors"
                      >
                        <Target className="w-3 h-3 text-indigo-600" />
                        Target Marks
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMarksModalCourse(course)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Marks & Assessment
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Responsive Charts Section (Lazy-Loaded) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        <LazySgpaTrendChart data={trendData} maxPoint={gradingScheme?.scheme_data?.max_point || 10} />
        <LazyAttendanceThresholdChart data={courseChartStats} defaultThreshold={defaultThreshold} />
      </div>

      {/* Modals */}
      {marksModalCourse && (
        <CourseMarksModal
          isOpen={!!marksModalCourse}
          onClose={() => setMarksModalCourse(null)}
          course={marksModalCourse}
          onSaved={() => {}}
        />
      )}

      {rulesModalCourse && (
        <CourseRulesModal
          isOpen={!!rulesModalCourse}
          onClose={() => setRulesModalCourse(null)}
          course={rulesModalCourse}
          onSaved={() => {}}
        />
      )}

      {finalGradeCourse && (
        <FinalGradeModal
          isOpen={!!finalGradeCourse}
          onClose={() => setFinalGradeCourse(null)}
          course={finalGradeCourse}
          termId={currentTerm?.id}
          existingResult={
            allGradeResults
              .filter(g => g.course_id === finalGradeCourse.id)
              .sort((a, b) => b.attempt_number - a.attempt_number)[0]
          }
          components={allComponents.filter(c => c.course_id === finalGradeCourse.id)}
          marks={allMarks.filter(m =>
            allComponents.some(c => c.course_id === finalGradeCourse.id && c.id === m.component_id)
          )}
          gradingScheme={gradingScheme}
          currentAttendancePct={courseAttendanceMap.get(finalGradeCourse.id)}
          onSaved={() => {}}
        />
      )}

      {isSchemeModalOpen && gradingScheme && (
        <GradingSchemeModal
          isOpen={isSchemeModalOpen}
          onClose={() => setIsSchemeModalOpen(false)}
          gradingScheme={gradingScheme}
          onSaved={() => {}}
        />
      )}

      {isRequiredMarksOpen && (
        <RequiredMarksModal
          isOpen={isRequiredMarksOpen}
          onClose={() => setIsRequiredMarksOpen(false)}
          courses={termCourses}
          initialCourseId={requiredMarksCourseId}
          allComponents={allComponents}
          allMarks={allMarks}
          gradingScheme={gradingScheme || null}
        />
      )}

      {isSimulatorOpen && (
        <GradeSimulatorModal
          isOpen={isSimulatorOpen}
          onClose={() => setIsSimulatorOpen(false)}
          courses={termCourses}
          existingResults={allGradeResults.filter(g => termCourses.some(c => c.id === g.course_id))}
          allGradeResultsAcrossTerms={allGradeResults}
          allCoursesAcrossTerms={allCourses}
          gradingScheme={gradingScheme || null}
          entryType={program?.entry_type}
        />
      )}

      {isPlannerOpen && (
        <TargetPlannerModal
          isOpen={isPlannerOpen}
          onClose={() => setIsPlannerOpen(false)}
          currentCgpa={cgpaResult.cgpa}
          completedCredits={cgpaResult.total_gpa_credits}
          gradingScheme={gradingScheme || null}
          terms={terms}
          currentTerm={currentTerm || null}
        />
      )}

      {isTermManagerOpen && (
        <TermManagerModal
          isOpen={isTermManagerOpen}
          onClose={() => setIsTermManagerOpen(false)}
          terms={terms}
          allCourses={allCourses}
          allGradeResults={allGradeResults}
          activeTermId={currentTerm?.id}
          onTermChanged={() => {}}
        />
      )}
    </PageContainer>
  );
};
