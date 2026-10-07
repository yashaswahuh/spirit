import { describe, it, expect } from 'vitest';
import {
  evaluateRuleGroup,
  calculateCourseInternalMarks,
  EvaluatedComponent,
} from '../marks';

describe('Assessment Marks Engine', () => {
  describe('evaluateRuleGroup with best_of_N', () => {
    it('picks top N scores and evenly distributes group weightage', () => {
      // 3 Continuous Assessment Tests (CATs)
      // CAT 1: 45 / 50 = 90%
      // CAT 2: 30 / 50 = 60%
      // CAT 3: 40 / 50 = 80%
      // Total group weightage = 15 + 15 + 15 = 45% (or 30%)
      const catGroup: EvaluatedComponent[] = [
        { id: 'cat1', name: 'CAT 1', max_marks: 50, obtained_marks: 45, weightage: 15, rule: 'best_of_N' },
        { id: 'cat2', name: 'CAT 2', max_marks: 50, obtained_marks: 30, weightage: 15, rule: 'best_of_N' },
        { id: 'cat3', name: 'CAT 3', max_marks: 50, obtained_marks: 40, weightage: 15, rule: 'best_of_N' },
      ];

      // Best 2 of 3
      const evaluated = evaluateRuleGroup(catGroup, 'best_of_N', { n: 2 });
      expect(evaluated).toHaveLength(3);

      const cat1Contrib = evaluated.find(c => c.id === 'cat1')!;
      const cat2Contrib = evaluated.find(c => c.id === 'cat2')!;
      const cat3Contrib = evaluated.find(c => c.id === 'cat3')!;

      // Top 2 are CAT 1 (90%) and CAT 3 (80%)
      expect(cat1Contrib.is_dropped_or_excluded).toBe(false);
      expect(cat3Contrib.is_dropped_or_excluded).toBe(false);
      // CAT 2 is dropped
      expect(cat2Contrib.is_dropped_or_excluded).toBe(true);

      // Group weightage total is 45. Divided between top 2 -> 22.5 each
      expect(cat1Contrib.weightage).toBe(22.5);
      expect(cat3Contrib.weightage).toBe(22.5);
      expect(cat1Contrib.weighted_contribution).toBeCloseTo((90 / 100) * 22.5, 2);
      expect(cat3Contrib.weighted_contribution).toBeCloseTo((80 / 100) * 22.5, 2);
    });
  });

  describe('evaluateRuleGroup with drop_lowest', () => {
    it('drops the lowest scored component', () => {
      // 4 assignments, drop lowest 1
      const assignGroup: EvaluatedComponent[] = [
        { id: 'a1', name: 'Assignment 1', max_marks: 20, obtained_marks: 18, weightage: 5, rule: 'drop_lowest' }, // 90%
        { id: 'a2', name: 'Assignment 2', max_marks: 20, obtained_marks: 10, weightage: 5, rule: 'drop_lowest' }, // 50% (Lowest)
        { id: 'a3', name: 'Assignment 3', max_marks: 20, obtained_marks: 16, weightage: 5, rule: 'drop_lowest' }, // 80%
        { id: 'a4', name: 'Assignment 4', max_marks: 20, obtained_marks: 20, weightage: 5, rule: 'drop_lowest' }, // 100%
      ];

      const evaluated = evaluateRuleGroup(assignGroup, 'drop_lowest', { count: 1 });
      const a2 = evaluated.find(c => c.id === 'a2')!;
      expect(a2.is_dropped_or_excluded).toBe(true);

      const kept = evaluated.filter(c => !c.is_dropped_or_excluded);
      expect(kept).toHaveLength(3);
    });
  });

  describe('calculateCourseInternalMarks', () => {
    it('integrates standalone and group components into overall course marks', () => {
      const components: EvaluatedComponent[] = [
        // Standalone Assignment: 100% on 10 weightage -> 10 marks
        { id: 'asn', name: 'Term Paper', max_marks: 50, obtained_marks: 50, weightage: 10, rule: 'normal' },
        // Standalone Lab Internal: 80% on 20 weightage -> 16 marks
        { id: 'lab', name: 'Lab Exam', max_marks: 50, obtained_marks: 40, weightage: 20, rule: 'normal' },
        // Best 1 of 2 Quizzes (total 10 weightage)
        { id: 'q1', name: 'Quiz 1', max_marks: 20, obtained_marks: 18, weightage: 5, rule: 'best_of_N', rule_group: 'quizzes', rule_params: { n: 1 } }, // 90%
        { id: 'q2', name: 'Quiz 2', max_marks: 20, obtained_marks: 10, weightage: 5, rule: 'best_of_N', rule_group: 'quizzes', rule_params: { n: 1 } }, // 50%
      ];

      const summary = calculateCourseInternalMarks(components);
      // Evaluated weightage = 10 (asn) + 20 (lab) + 10 (quiz group) = 40
      expect(summary.total_weightage_evaluated).toBe(40);
      // Obtained = 10 + 16 + (90% of 10 = 9) = 35 marks out of 40
      expect(summary.total_weighted_marks_obtained).toBe(35);
      // Scaled = (35 / 40) * 100 = 87.5%
      expect(summary.scaled_percentage).toBe(87.5);
    });
  });
});

