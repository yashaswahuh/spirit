/**
 * Pure TypeScript Assessment Marks Engine
 * Handles normal, best-of-N, and drop-lowest assessment rules for internal and coursework marks.
 */

import { AssessmentRuleType, AssessmentRuleParams } from '../types';

export interface EvaluatedComponent {
  id: string;
  name: string;
  max_marks: number;
  obtained_marks: number;
  weightage: number; // e.g. 15% or 30%
  rule: AssessmentRuleType; // 'normal' | 'best_of_N' | 'drop_lowest'
  rule_group?: string | null;
  rule_params?: AssessmentRuleParams | null;
  status?: 'entered' | 'absent' | 'not_held';
  is_end_sem?: boolean;
  min_pass_marks?: number | null;
}

export interface ComponentContribution {
  id: string;
  name: string;
  obtained_marks: number;
  max_marks: number;
  percentage: number;
  weightage: number;
  weighted_contribution: number; // contribution to final 100% course total
  is_dropped_or_excluded: boolean;
  status: 'entered' | 'absent' | 'not_held';
}

export interface CourseMarksSummary {
  total_weightage_evaluated: number;
  total_weighted_marks_obtained: number; // out of total_weightage_evaluated
  scaled_percentage: number; // out of 100% for the components evaluated
  components: ComponentContribution[];
}

/**
 * Normalizes a component's obtained mark into a percentage (0 - 100).
 */
export function getComponentPercentage(obtained: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100.0, Math.max(0.0, (obtained / max) * 100));
}

/**
 * Evaluates a set of components that belong to a single rule group (e.g. Best 2 of 3 CATs).
 */
export function evaluateRuleGroup(
  groupItems: EvaluatedComponent[],
  rule: AssessmentRuleType,
  params?: AssessmentRuleParams | null
): ComponentContribution[] {
  if (groupItems.length === 0) return [];

  // Filter out components that are not yet held
  const heldItems = groupItems.filter(item => item.status !== 'not_held');
  const notHeldItems = groupItems.filter(item => item.status === 'not_held');

  const notHeldContributions: ComponentContribution[] = notHeldItems.map(item => ({
    id: item.id,
    name: item.name,
    obtained_marks: 0,
    max_marks: item.max_marks,
    percentage: 0,
    weightage: 0,
    weighted_contribution: 0,
    is_dropped_or_excluded: true,
    status: 'not_held',
  }));

  if (heldItems.length === 0) {
    return notHeldContributions;
  }

  // Calculate percentage for each held item (absent evaluates to 0%)
  const scored = heldItems.map(item => {
    const rawObtained = item.status === 'absent' ? 0 : item.obtained_marks;
    return {
      item,
      effectiveObtained: rawObtained,
      pct: getComponentPercentage(rawObtained, item.max_marks),
    };
  });

  const totalHeldWeightage = heldItems.reduce((acc, curr) => acc + curr.weightage, 0);

  if (rule === 'best_of_N') {
    const desiredN = params?.n ?? 1;
    const n = Math.max(1, Math.min(heldItems.length, desiredN));
    // Sort descending by percentage score
    scored.sort((a, b) => b.pct - a.pct);

    const weightagePerSelected = totalHeldWeightage / n;

    const evaluatedHeld = scored.map((s, index) => {
      const isSelected = index < n;
      const weightage = isSelected ? weightagePerSelected : 0;
      const weightedContribution = isSelected ? (s.pct / 100) * weightage : 0;

      return {
        id: s.item.id,
        name: s.item.name,
        obtained_marks: s.effectiveObtained,
        max_marks: s.item.max_marks,
        percentage: s.pct,
        weightage,
        weighted_contribution: weightedContribution,
        is_dropped_or_excluded: !isSelected,
        status: s.item.status || 'entered',
      };
    });

    return [...evaluatedHeld, ...notHeldContributions];
  }

  if (rule === 'drop_lowest') {
    const desiredDrop = params?.count ?? 1;
    const dropCount = Math.max(0, Math.min(heldItems.length - 1, desiredDrop));
    // Sort ascending by percentage score to drop the lowest
    scored.sort((a, b) => a.pct - b.pct);

    const keptCount = heldItems.length - dropCount;
    const weightagePerKept = keptCount > 0 ? totalHeldWeightage / keptCount : 0;

    const evaluatedHeld = scored.map((s, index) => {
      const isDropped = index < dropCount;
      const weightage = isDropped ? 0 : weightagePerKept;
      const weightedContribution = isDropped ? 0 : (s.pct / 100) * weightage;

      return {
        id: s.item.id,
        name: s.item.name,
        obtained_marks: s.effectiveObtained,
        max_marks: s.item.max_marks,
        percentage: s.pct,
        weightage,
        weighted_contribution: weightedContribution,
        is_dropped_or_excluded: isDropped,
        status: s.item.status || 'entered',
      };
    });

    return [...evaluatedHeld, ...notHeldContributions];
  }

  // Normal rule (no group dropping)
  const evaluatedHeld = scored.map(s => {
    const weightedContribution = (s.pct / 100) * s.item.weightage;
    return {
      id: s.item.id,
      name: s.item.name,
      obtained_marks: s.effectiveObtained,
      max_marks: s.item.max_marks,
      percentage: s.pct,
      weightage: s.item.weightage,
      weighted_contribution: weightedContribution,
      is_dropped_or_excluded: false,
      status: s.item.status || 'entered',
    };
  });

  return [...evaluatedHeld, ...notHeldContributions];
}

/**
 * Computes overall internal marks and contributions across all components of a course.
 * Automatically groups components sharing the same rule_group identifier.
 */
export function calculateCourseInternalMarks(
  components: EvaluatedComponent[]
): CourseMarksSummary {
  const standaloneComponents: EvaluatedComponent[] = [];
  const groups = new Map<string, EvaluatedComponent[]>();

  for (const c of components) {
    if (c.rule_group && (c.rule === 'best_of_N' || c.rule === 'drop_lowest')) {
      const list = groups.get(c.rule_group) || [];
      list.push(c);
      groups.set(c.rule_group, list);
    } else {
      standaloneComponents.push(c);
    }
  }

  const allContributions: ComponentContribution[] = [];

  // Evaluate standalone components
  for (const c of standaloneComponents) {
    if (c.status === 'not_held') {
      allContributions.push({
        id: c.id,
        name: c.name,
        obtained_marks: 0,
        max_marks: c.max_marks,
        percentage: 0,
        weightage: 0,
        weighted_contribution: 0,
        is_dropped_or_excluded: true,
        status: 'not_held',
      });
      continue;
    }

    const effectiveObtained = c.status === 'absent' ? 0 : c.obtained_marks;
    const pct = getComponentPercentage(effectiveObtained, c.max_marks);
    const contrib = (pct / 100) * c.weightage;
    allContributions.push({
      id: c.id,
      name: c.name,
      obtained_marks: effectiveObtained,
      max_marks: c.max_marks,
      percentage: pct,
      weightage: c.weightage,
      weighted_contribution: contrib,
      is_dropped_or_excluded: false,
      status: c.status || 'entered',
    });
  }

  // Evaluate rule groups
  for (const [, groupItems] of groups) {
    const rule = groupItems[0].rule;
    const params = groupItems[0].rule_params;
    const groupContributions = evaluateRuleGroup(groupItems, rule, params);
    allContributions.push(...groupContributions);
  }

  let totalWeightage = 0;
  let totalWeightedMarks = 0;

  for (const contrib of allContributions) {
    if (!contrib.is_dropped_or_excluded) {
      totalWeightage += contrib.weightage;
      totalWeightedMarks += contrib.weighted_contribution;
    }
  }

  const scaledPercentage = totalWeightage > 0 ? (totalWeightedMarks / totalWeightage) * 100 : 0.0;

  return {
    total_weightage_evaluated: totalWeightage,
    total_weighted_marks_obtained: totalWeightedMarks,
    scaled_percentage: scaledPercentage,
    components: allContributions,
  };
}

import { GradeScaleEntry } from '../types';

/**
 * Derives a letter grade and grade points from an overall percentage score
 * based on a grading scale and pass mark threshold.
 */
export function deriveGradeFromMarks(
  percentage: number,
  scale: GradeScaleEntry[],
  passMark: number
): { letter: string; points: number; is_passing: boolean } {
  const isPassing = percentage >= passMark;
  if (scale.length === 0) {
    return {
      letter: isPassing ? 'P' : 'F',
      points: isPassing ? 10 : 0,
      is_passing: isPassing,
    };
  }

  // Sort scale descending by min_percentage or points
  const sorted = [...scale].sort((a, b) => {
    const aMin = a.min_percentage ?? a.points * 10;
    const bMin = b.min_percentage ?? b.points * 10;
    return bMin - aMin;
  });

  for (const entry of sorted) {
    const minThreshold = entry.min_percentage ?? entry.points * 10;
    if (percentage >= minThreshold) {
      return {
        letter: entry.letter,
        points: entry.points,
        is_passing: isPassing,
      };
    }
  }

  const lowest = sorted[sorted.length - 1];
  return {
    letter: lowest ? lowest.letter : 'F',
    points: lowest ? lowest.points : 0,
    is_passing: isPassing,
  };
}

export interface CourseEligibilityInput {
  attendancePercentage: number;
  attendanceThreshold: number;
  internalObtained?: number;
  internalMax?: number;
  minInternalRequired?: number | null;
  endSemObtained?: number | null;
  endSemMax?: number | null;
  minEndSemRequired?: number | null;
  overallPercentage?: number | null;
  passMark?: number | null;
}

export interface CourseEligibilityResult {
  is_attendance_eligible: boolean;
  is_internal_eligible: boolean;
  is_end_sem_eligible: boolean;
  is_overall_passed: boolean;
  is_at_risk_of_detention: boolean;
  reasons: string[];
}

/**
 * Validates course eligibility against institutional rules:
 * - Attendance threshold (risk of detention flag)
 * - Minimum internal marks required to be eligible for end-sem
 * - Separate minimum in the end-sem exam
 * - Overall pass mark
 */
export function checkCourseEligibility(
  input: CourseEligibilityInput
): CourseEligibilityResult {
  const reasons: string[] = [];
  const {
    attendancePercentage,
    attendanceThreshold,
    internalObtained,
    minInternalRequired,
    endSemObtained,
    minEndSemRequired,
    overallPercentage,
    passMark = 40,
  } = input;

  // 1. Attendance eligibility
  const isAttendanceEligible = attendancePercentage >= attendanceThreshold;
  const isAtRiskOfDetention = !isAttendanceEligible;
  if (isAtRiskOfDetention) {
    reasons.push(`Attendance ${attendancePercentage.toFixed(1)}% is below required ${attendanceThreshold}% (Detention Risk)`);
  }

  // 2. Minimum internal marks eligibility
  let isInternalEligible = true;
  if (minInternalRequired !== undefined && minInternalRequired !== null && internalObtained !== undefined) {
    if (internalObtained < minInternalRequired) {
      isInternalEligible = false;
      reasons.push(`Internal score ${internalObtained} is below minimum requirement of ${minInternalRequired}`);
    }
  }

  // 3. Separate end-sem minimum eligibility
  let isEndSemEligible = true;
  if (minEndSemRequired !== undefined && minEndSemRequired !== null && endSemObtained !== undefined && endSemObtained !== null) {
    if (endSemObtained < minEndSemRequired) {
      isEndSemEligible = false;
      reasons.push(`End-sem score ${endSemObtained} is below minimum requirement of ${minEndSemRequired}`);
    }
  }

  // 4. Overall passing
  let isOverallPassed = true;
  if (overallPercentage !== undefined && overallPercentage !== null && passMark !== null && passMark !== undefined) {
    if (overallPercentage < passMark) {
      isOverallPassed = false;
      reasons.push(`Overall percentage ${overallPercentage.toFixed(1)}% is below pass mark ${passMark}%`);
    }
  }

  if (!isAttendanceEligible || !isInternalEligible || !isEndSemEligible) {
    isOverallPassed = false;
  }

  return {
    is_attendance_eligible: isAttendanceEligible,
    is_internal_eligible: isInternalEligible,
    is_end_sem_eligible: isEndSemEligible,
    is_overall_passed: isOverallPassed,
    is_at_risk_of_detention: isAtRiskOfDetention,
    reasons,
  };
}

/**
 * Convenience helper combining raw components and marks into an evaluated summary.
 */
export function calculateCourseMarks(
  components: Array<{
    id: string;
    name: string;
    max_marks: number;
    weightage: number;
    rule: AssessmentRuleType;
    rule_group?: string | null;
    rule_params?: AssessmentRuleParams | null;
    is_end_sem?: boolean;
    min_pass_marks?: number | null;
  }>,
  marks: Array<{
    component_id: string;
    obtained_marks?: number | null;
    status?: 'entered' | 'absent' | 'not_held';
  }>
): CourseMarksSummary & { total_max_marks: number; total_obtained_marks: number } {
  const evaluatedList: EvaluatedComponent[] = components.map(c => {
    const mark = marks.find(m => m.component_id === c.id);
    return {
      id: c.id,
      name: c.name,
      max_marks: c.max_marks,
      obtained_marks: mark?.status === 'entered' ? (mark.obtained_marks ?? 0) : 0,
      weightage: c.weightage,
      rule: c.rule,
      rule_group: c.rule_group,
      rule_params: c.rule_params,
      status: mark?.status || 'not_held',
      is_end_sem: c.is_end_sem,
      min_pass_marks: c.min_pass_marks,
    };
  });

  const summary = calculateCourseInternalMarks(evaluatedList);

  let totalMaxMarks = 0;
  let totalObtainedMarks = 0;
  for (const contrib of summary.components) {
    if (!contrib.is_dropped_or_excluded && contrib.status !== 'not_held') {
      totalMaxMarks += contrib.max_marks;
      totalObtainedMarks += contrib.obtained_marks;
    }
  }

  return {
    ...summary,
    total_max_marks: totalMaxMarks,
    total_obtained_marks: totalObtainedMarks,
  };
}

