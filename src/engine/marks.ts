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

  // Calculate percentage for each item
  const scored = groupItems.map(item => ({
    item,
    pct: getComponentPercentage(item.obtained_marks, item.max_marks),
  }));

  if (rule === 'best_of_N') {
    const n = Math.max(1, Math.min(groupItems.length, params?.n ?? 1));
    // Sort descending by percentage score
    scored.sort((a, b) => b.pct - a.pct);

    const totalGroupWeightage = groupItems.reduce((acc, curr) => acc + curr.weightage, 0);
    // Evenly divide group weightage among the chosen top N
    const weightagePerSelected = totalGroupWeightage / n;

    return scored.map((s, index) => {
      const isSelected = index < n;
      const weightage = isSelected ? weightagePerSelected : 0;
      const weightedContribution = isSelected ? (s.pct / 100) * weightage : 0;

      return {
        id: s.item.id,
        name: s.item.name,
        obtained_marks: s.item.obtained_marks,
        max_marks: s.item.max_marks,
        percentage: s.pct,
        weightage,
        weighted_contribution: weightedContribution,
        is_dropped_or_excluded: !isSelected,
      };
    });
  }

  if (rule === 'drop_lowest') {
    const dropCount = Math.max(1, Math.min(groupItems.length - 1, params?.count ?? 1));
    // Sort ascending by percentage score to drop the lowest
    scored.sort((a, b) => a.pct - b.pct);

    const keptItems = scored.slice(dropCount);
    const totalGroupWeightage = groupItems.reduce((acc, curr) => acc + curr.weightage, 0);
    const weightagePerKept = keptItems.length > 0 ? totalGroupWeightage / keptItems.length : 0;

    return scored.map((s, index) => {
      const isDropped = index < dropCount;
      const weightage = isDropped ? 0 : weightagePerKept;
      const weightedContribution = isDropped ? 0 : (s.pct / 100) * weightage;

      return {
        id: s.item.id,
        name: s.item.name,
        obtained_marks: s.item.obtained_marks,
        max_marks: s.item.max_marks,
        percentage: s.pct,
        weightage,
        weighted_contribution: weightedContribution,
        is_dropped_or_excluded: isDropped,
      };
    });
  }

  // Normal rule (no group dropping)
  return scored.map(s => {
    const weightedContribution = (s.pct / 100) * s.item.weightage;
    return {
      id: s.item.id,
      name: s.item.name,
      obtained_marks: s.item.obtained_marks,
      max_marks: s.item.max_marks,
      percentage: s.pct,
      weightage: s.item.weightage,
      weighted_contribution: weightedContribution,
      is_dropped_or_excluded: false,
    };
  });
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
    const pct = getComponentPercentage(c.obtained_marks, c.max_marks);
    const contrib = (pct / 100) * c.weightage;
    allContributions.push({
      id: c.id,
      name: c.name,
      obtained_marks: c.obtained_marks,
      max_marks: c.max_marks,
      percentage: pct,
      weightage: c.weightage,
      weighted_contribution: contrib,
      is_dropped_or_excluded: false,
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

