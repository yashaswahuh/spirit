/**
 * Pure TypeScript Annual & Division-Based Grading Engine
 * Handles degrees with percentage and division totals (e.g. Annual MBBS, LLB, B.Com).
 */

import { DivisionThreshold, RoundingRule } from '../types';
import { applyRounding } from './gpa';

export interface SubjectMarksRecord {
  subject_name: string;
  obtained_marks: number;
  max_marks: number;
  min_pass_marks?: number;
}

export interface AnnualDivisionResult {
  total_obtained: number;
  total_max: number;
  percentage: number;
  division_name: string;
  is_all_passed: boolean;
  failed_subjects: string[];
}

export const DEFAULT_DIVISION_THRESHOLDS: DivisionThreshold[] = [
  { name: 'First Class with Distinction', min_percentage: 75.0 },
  { name: 'First Class', min_percentage: 60.0 },
  { name: 'Second Class', min_percentage: 50.0 },
  { name: 'Pass Class', min_percentage: 40.0 },
];

/**
 * Computes overall marks, percentage, and division classification for annual system degrees.
 */
export function calculateAnnualDivision(
  subjects: SubjectMarksRecord[],
  thresholds: DivisionThreshold[] = DEFAULT_DIVISION_THRESHOLDS,
  rounding?: RoundingRule
): AnnualDivisionResult {
  let totalObtained = 0;
  let totalMax = 0;
  let isAllPassed = true;
  const failedSubjects: string[] = [];

  for (const sub of subjects) {
    totalObtained += sub.obtained_marks;
    totalMax += sub.max_marks;

    if (sub.min_pass_marks !== undefined && sub.obtained_marks < sub.min_pass_marks) {
      isAllPassed = false;
      failedSubjects.push(sub.subject_name);
    }
  }

  const rawPct = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0.0;
  const percentage = applyRounding(rawPct, rounding);

  // If any subject failed, the division is Fail / Arrear
  if (!isAllPassed) {
    return {
      total_obtained: totalObtained,
      total_max: totalMax,
      percentage,
      division_name: 'Fail / Arrear',
      is_all_passed: false,
      failed_subjects: failedSubjects,
    };
  }

  // Sort thresholds descending by min_percentage to find matching class
  const sortedThresholds = [...thresholds].sort((a, b) => b.min_percentage - a.min_percentage);
  let matchedDivision = 'Fail';

  for (const t of sortedThresholds) {
    if (percentage >= t.min_percentage) {
      matchedDivision = t.name;
      break;
    }
  }

  return {
    total_obtained: totalObtained,
    total_max: totalMax,
    percentage,
    division_name: matchedDivision,
    is_all_passed: true,
    failed_subjects: [],
  };
}

