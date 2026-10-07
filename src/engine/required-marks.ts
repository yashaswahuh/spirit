/**
 * Pure TypeScript Required End-Sem Marks Solver Engine
 * Calculates minimum end-sem marks to reach a target grade or passing percentage
 * given internal marks, relative weightages, and separate minimum passing thresholds.
 */

import { EndSemRequiredMarksInput, EndSemRequiredMarksResult } from '../types';

/**
 * Solves for required end-sem marks given internal marks and target percentage.
 */
export function calculateRequiredEndSemMarks(
  input: EndSemRequiredMarksInput
): EndSemRequiredMarksResult {
  const {
    internal_obtained,
    internal_max,
    internal_weightage,
    end_sem_max,
    end_sem_weightage,
    target_total_percentage,
    end_sem_min_pass_marks = 0,
  } = input;

  // Prevent divide-by-zero
  if (internal_max <= 0 || end_sem_max <= 0 || end_sem_weightage <= 0) {
    return {
      required_raw_marks: 0,
      required_percentage: 0,
      is_achievable: false,
      limiting_reason: 'exceeds_max_marks',
    };
  }

  // Calculate internal weighted contribution
  const internalPct = (Math.max(0, internal_obtained) / internal_max) * 100;
  const internalWeighted = (internalPct / 100) * internal_weightage;

  // Required contribution from end-sem
  const neededEndSemWeighted = target_total_percentage - internalWeighted;

  let rawNeededMarks = 0;
  if (neededEndSemWeighted > 0) {
    rawNeededMarks = (neededEndSemWeighted / end_sem_weightage) * end_sem_max;
  }

  // Enforce separate end-sem minimum pass marks if specified
  const effectiveRequiredRaw = Math.max(rawNeededMarks, end_sem_min_pass_marks);

  // Round up to 2 decimal places for clean reporting
  const roundedRawMarks = Math.round(effectiveRequiredRaw * 100) / 100;
  const requiredPercentage = Math.round((roundedRawMarks / end_sem_max) * 10000) / 100;

  // Check if achievable within max marks
  if (roundedRawMarks > end_sem_max) {
    return {
      required_raw_marks: roundedRawMarks,
      required_percentage: requiredPercentage,
      is_achievable: false,
      limiting_reason: 'exceeds_max_marks',
    };
  }

  return {
    required_raw_marks: Math.max(0, roundedRawMarks),
    required_percentage: Math.max(0, requiredPercentage),
    is_achievable: true,
  };
}

