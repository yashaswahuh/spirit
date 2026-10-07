/**
 * Pure TypeScript GPA & CGPA Calculation Engine
 * Handles SGPA, cumulative CGPA, backlog repeat handling, percentage conversions, and rounding.
 */

import {
  RoundingRule,
  CgpaToPercentageRule,
  CourseGradeCreditInput,
  SgpaResult,
} from '../types';

/**
 * Applies rounding rule to a numerical value.
 */
export function applyRounding(value: number, rule?: RoundingRule): number {
  if (!rule) {
    return Math.round(value * 100) / 100; // default 2 decimal places
  }

  const factor = Math.pow(10, rule.precision);
  switch (rule.mode) {
    case 'floor':
      return Math.floor(value * factor) / factor;
    case 'ceil':
      return Math.ceil(value * factor) / factor;
    case 'round':
    default:
      return Math.round(value * factor) / factor;
  }
}

/**
 * Calculates SGPA (Semester Grade Point Average) for a term.
 * SGPA = sum(credits * grade_points) / sum(credits) for GPA-counting courses.
 * Special grades:
 * - 'W' (Withdrawn): excluded from GPA credits and total credits.
 * - 'I' (Incomplete): excluded from GPA calculation.
 * - 'AB' (Absent): 0 points, counted in GPA credits.
 * - Audit / 0-credit courses: excluded from GPA calculation.
 */
export function calculateSgpa(
  courses: CourseGradeCreditInput[],
  rounding?: RoundingRule
): SgpaResult {
  let weightedPointsSum = 0;
  let gpaCreditsSum = 0;
  let totalCreditsSum = 0;

  for (const course of courses) {
    const letter = course.letter_grade?.toUpperCase().trim();

    // Withdrawn courses are excluded completely
    if (letter === 'W') {
      continue;
    }

    totalCreditsSum += course.credits;

    // Audit or non-credit courses do not affect GPA
    if (course.is_audit || !course.counts_toward_gpa || course.credits === 0) {
      continue;
    }

    // Incomplete courses do not affect GPA until resolved
    if (letter === 'I') {
      continue;
    }

    // Absent gives 0 points but counts in GPA
    const points = letter === 'AB' ? 0.0 : (course.grade_points ?? 0.0);

    weightedPointsSum += course.credits * points;
    gpaCreditsSum += course.credits;
  }

  const rawSgpa = gpaCreditsSum > 0 ? weightedPointsSum / gpaCreditsSum : 0.0;
  const roundedSgpa = applyRounding(rawSgpa, rounding);

  return {
    sgpa: roundedSgpa,
    total_credits: totalCreditsSum,
    gpa_credits: gpaCreditsSum,
  };
}

export interface CourseAttemptRecord {
  course_id: string;
  credits: number;
  grade_points: number;
  counts_toward_gpa: boolean;
  attempt_number: number;
  term_number?: number;
}

export interface CgpaOptions {
  repeat_handling: 'replace_old' | 'keep_best';
  rounding?: RoundingRule;
  cgpa_to_percentage?: CgpaToPercentageRule;
  entry_term?: number; // e.g. 3 for lateral entry
}

export interface CgpaComputationResult {
  cgpa: number;
  total_gpa_credits: number;
  percentage: number;
  evaluated_courses_count: number;
}

/**
 * Computes CGPA across terms with backlog and repeat handling.
 * - replace_old: Keeps the attempt with the highest attempt_number.
 * - keep_best: Keeps the attempt with the highest grade_points.
 * - entry_term: Ignores terms prior to entry term (e.g. Terms 1 & 2 for lateral entry).
 */
export function calculateCgpa(
  allAttempts: CourseAttemptRecord[],
  options: CgpaOptions
): CgpaComputationResult {
  // Filter for GPA-counting courses, honoring lateral entry term threshold
  const entryTerm = options.entry_term ?? 1;
  const gpaCourses = allAttempts.filter(
    c => c.counts_toward_gpa && (c.term_number === undefined || c.term_number >= entryTerm)
  );

  // Group by course_id to resolve retakes/backlogs
  const courseGroups = new Map<string, CourseAttemptRecord[]>();
  for (const attempt of gpaCourses) {
    const list = courseGroups.get(attempt.course_id) || [];
    list.push(attempt);
    courseGroups.set(attempt.course_id, list);
  }

  let weightedPointsSum = 0;
  let totalCredits = 0;
  let evaluatedCount = 0;

  for (const [, attempts] of courseGroups) {
    evaluatedCount++;
    let chosenAttempt: CourseAttemptRecord;

    if (attempts.length === 1) {
      chosenAttempt = attempts[0];
    } else if (options.repeat_handling === 'replace_old') {
      // Highest attempt number (latest attempt)
      chosenAttempt = attempts.reduce((prev, curr) =>
        curr.attempt_number >= prev.attempt_number ? curr : prev
      );
    } else {
      // 'keep_best': Highest grade points
      chosenAttempt = attempts.reduce((prev, curr) =>
        curr.grade_points >= prev.grade_points ? curr : prev
      );
    }

    weightedPointsSum += chosenAttempt.credits * chosenAttempt.grade_points;
    totalCredits += chosenAttempt.credits;
  }

  const rawCgpa = totalCredits > 0 ? weightedPointsSum / totalCredits : 0.0;
  const roundedCgpa = applyRounding(rawCgpa, options.rounding);

  const percentage = convertCgpaToPercentage(
    roundedCgpa,
    options.cgpa_to_percentage,
    options.rounding
  );

  return {
    cgpa: roundedCgpa,
    total_gpa_credits: totalCredits,
    percentage,
    evaluated_courses_count: evaluatedCount,
  };
}

/**
 * Converts CGPA to equivalent percentage based on scheme rule:
 * - multiplier (e.g. 9.5 for AICTE/CBSE or 10.0)
 * - custom_formula (e.g. (cgpa - 0.75) * 10 for VTU)
 */
export function convertCgpaToPercentage(
  cgpa: number,
  rule?: CgpaToPercentageRule,
  rounding?: RoundingRule
): number {
  if (cgpa <= 0) return 0.0;

  let rawPercentage: number;

  if (!rule || rule.rule_type === 'multiplier') {
    const mult = rule?.multiplier ?? 9.5;
    rawPercentage = cgpa * mult;
  } else if (rule.rule_type === 'custom_formula') {
    if (rule.formula_expression) {
      try {
        // Safe evaluation of simple mathematical expression: replace cgpa with number
        // Allowed characters: numbers, cgpa, spaces, +, -, *, /, (, )
        const sanitized = rule.formula_expression
          .replace(/\bcgpa\b/gi, cgpa.toString())
          .trim();

        if (/^[0-9+\-*/().\s]+$/.test(sanitized)) {
          // eslint-disable-next-line no-new-func
          const result = new Function(`return (${sanitized});`)();
          rawPercentage = typeof result === 'number' && !isNaN(result) ? result : cgpa * 9.5;
        } else {
          rawPercentage = cgpa * 9.5;
        }
      } catch {
        rawPercentage = cgpa * 9.5;
      }
    } else {
      rawPercentage = cgpa * 9.5;
    }
  } else {
    rawPercentage = cgpa * 9.5;
  }

  const bounded = Math.min(100.0, Math.max(0.0, rawPercentage));
  return applyRounding(bounded, rounding);
}

export interface TargetSgpaPlannerInput {
  currentCgpa: number;
  completedCredits: number;
  targetCgpa: number;
  remainingCredits: number;
  maxPoint?: number; // default 10.0
}

export interface TargetSgpaPlannerResult {
  requiredSgpa: number;
  isAchievable: boolean;
  reason?: string;
}

/**
 * Calculates the required SGPA needed in remaining credits to achieve a target CGPA.
 * Explicitly indicates if target is mathematically impossible (> maxPoint).
 */
export function calculateRequiredSgpaForTarget(
  input: TargetSgpaPlannerInput,
  rounding?: RoundingRule
): TargetSgpaPlannerResult {
  const { currentCgpa, completedCredits, targetCgpa, remainingCredits, maxPoint = 10.0 } = input;

  if (remainingCredits <= 0) {
    const isMet = currentCgpa >= targetCgpa;
    return {
      requiredSgpa: 0,
      isAchievable: isMet,
      reason: isMet ? 'Target already met' : 'No remaining credits to improve CGPA',
    };
  }

  const totalCredits = completedCredits + remainingCredits;
  // targetCgpa = (currentCgpa * completedCredits + requiredSgpa * remainingCredits) / totalCredits
  const neededWeighted = targetCgpa * totalCredits - currentCgpa * completedCredits;
  const rawRequired = neededWeighted / remainingCredits;
  const rounded = applyRounding(rawRequired, rounding);

  if (rounded > maxPoint) {
    return {
      requiredSgpa: rounded,
      isAchievable: false,
      reason: `Requires an SGPA of ${rounded.toFixed(2)}, which exceeds the maximum scale limit of ${maxPoint}`,
    };
  }

  if (rounded <= 0) {
    return {
      requiredSgpa: 0,
      isAchievable: true,
      reason: 'Target is already secured with minimum passing grades',
    };
  }

  return {
    requiredSgpa: rounded,
    isAchievable: true,
  };
}


