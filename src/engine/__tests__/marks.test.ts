import { describe, it, expect } from 'vitest';
import {
  evaluateRuleGroup,
  calculateCourseInternalMarks,
  deriveGradeFromMarks,
  checkCourseEligibility,
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

    it('handles absent and not_held component statuses', () => {
      const components: EvaluatedComponent[] = [
        // Midsem 1: entered, 40/50 (80%) -> 16 marks out of 20
        { id: 'm1', name: 'Midsem 1', max_marks: 50, obtained_marks: 40, weightage: 20, rule: 'normal', status: 'entered' },
        // Midsem 2: absent -> 0 marks out of 20
        { id: 'm2', name: 'Midsem 2', max_marks: 50, obtained_marks: 0, weightage: 20, rule: 'normal', status: 'absent' },
        // End-Sem: not held yet -> excluded from evaluated weightage
        { id: 'end', name: 'End Sem', max_marks: 100, obtained_marks: 0, weightage: 60, rule: 'normal', status: 'not_held' },
      ];

      const summary = calculateCourseInternalMarks(components);
      // Evaluated weightage = 20 + 20 = 40 (End sem excluded)
      expect(summary.total_weightage_evaluated).toBe(40);
      expect(summary.total_weighted_marks_obtained).toBe(16);
      expect(summary.scaled_percentage).toBe(40.0);
    });
  });

  describe('deriveGradeFromMarks', () => {
    const scale = [
      { letter: 'O', points: 10, min_percentage: 90 },
      { letter: 'A+', points: 9, min_percentage: 80 },
      { letter: 'A', points: 8, min_percentage: 70 },
      { letter: 'B+', points: 7, min_percentage: 60 },
      { letter: 'B', points: 6, min_percentage: 50 },
      { letter: 'C', points: 5, min_percentage: 40 },
      { letter: 'F', points: 0, min_percentage: 0 },
    ];

    it('matches percentage into appropriate letter grade and points', () => {
      expect(deriveGradeFromMarks(95, scale, 40)).toEqual({ letter: 'O', points: 10, is_passing: true });
      expect(deriveGradeFromMarks(82, scale, 40)).toEqual({ letter: 'A+', points: 9, is_passing: true });
      expect(deriveGradeFromMarks(55, scale, 40)).toEqual({ letter: 'B', points: 6, is_passing: true });
      expect(deriveGradeFromMarks(35, scale, 40)).toEqual({ letter: 'F', points: 0, is_passing: false });
    });
  });

  describe('checkCourseEligibility', () => {
    it('flags detention risk when attendance is below threshold', () => {
      const result = checkCourseEligibility({
        attendancePercentage: 68.5,
        attendanceThreshold: 75.0,
      });

      expect(result.is_attendance_eligible).toBe(false);
      expect(result.is_at_risk_of_detention).toBe(true);
      expect(result.reasons[0]).toContain('Detention Risk');
    });

    it('enforces separate internal and end-sem minimum passing rules', () => {
      // Passed internal minimum (needs 15, got 18)
      // Failed end-sem minimum (needs 35, got 30)
      const result = checkCourseEligibility({
        attendancePercentage: 80.0,
        attendanceThreshold: 75.0,
        internalObtained: 18,
        minInternalRequired: 15,
        endSemObtained: 30,
        minEndSemRequired: 35,
        overallPercentage: 48,
        passMark: 40,
      });

      expect(result.is_attendance_eligible).toBe(true);
      expect(result.is_internal_eligible).toBe(true);
      expect(result.is_end_sem_eligible).toBe(false);
      expect(result.is_overall_passed).toBe(false);
    });

    it('evaluates separate Theory and Lab passing and detention rules for integrated courses', () => {
      // Zoology course with Lab + Theory
      // Case 1: Theory attendance is safe (82% >= 75%), but Lab attendance is in danger (65% < 75%)
      // Theory internal is passed (18 >= 15), Lab continuous internal failed (8 < 10)
      const result = checkCourseEligibility({
        attendancePercentage: 77.0, // overall combined looks OK
        attendanceThreshold: 75.0,
        splitAttendance: true,
        theoryAttendancePercentage: 82.0,
        theoryAttendanceThreshold: 75.0,
        labAttendancePercentage: 65.0,
        labAttendanceThreshold: 75.0,
        // Passing rules
        theoryInternalObtained: 18,
        minTheoryInternalRequired: 15,
        labInternalObtained: 8,
        minLabInternalRequired: 10,
        overallPercentage: 55,
        passMark: 40,
      });

      // Attendance detention risk flagged because of Lab
      expect(result.is_attendance_eligible).toBe(false);
      expect(result.is_at_risk_of_detention).toBe(true);
      expect(result.reasons.some(r => r.includes('Lab Detention Risk'))).toBe(true);

      // Lab internal minimum failed
      expect(result.is_internal_eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('Lab Continuous Internal'))).toBe(true);
      expect(result.is_overall_passed).toBe(false);
    });
  });

  describe('partitioned marks summary for integrated theory_and_lab courses', () => {
    it('produces distinct theory and lab summaries without splitting the course', () => {
      const components: EvaluatedComponent[] = [
        // Theory components (60% total weight)
        { id: 't_cat1', name: 'Theory CAT 1', max_marks: 50, obtained_marks: 40, weightage: 15, rule: 'normal', component_type: 'theory' }, // 80% -> 12 pts
        { id: 't_cat2', name: 'Theory CAT 2', max_marks: 50, obtained_marks: 45, weightage: 15, rule: 'normal', component_type: 'theory' }, // 90% -> 13.5 pts
        { id: 't_end', name: 'Theory End-Sem', max_marks: 100, obtained_marks: 70, weightage: 30, rule: 'normal', component_type: 'theory' }, // 70% -> 21 pts

        // Lab components (40% total weight)
        { id: 'l_cont', name: 'Lab Continuous Assessments', max_marks: 100, obtained_marks: 85, weightage: 20, rule: 'normal', component_type: 'lab' }, // 85% -> 17 pts
        { id: 'l_end', name: 'Lab Practical End-Sem', max_marks: 50, obtained_marks: 40, weightage: 20, rule: 'normal', component_type: 'lab' }, // 80% -> 16 pts
      ];

      const summary = calculateCourseInternalMarks(components);

      // Overall course summary
      expect(summary.total_weightage_evaluated).toBe(100);
      expect(summary.total_weighted_marks_obtained).toBe(12 + 13.5 + 21 + 17 + 16); // 79.5 marks
      expect(summary.scaled_percentage).toBe(79.5);

      // Theory partition summary
      expect(summary.theory).toBeDefined();
      expect(summary.theory?.total_weightage_evaluated).toBe(60);
      expect(summary.theory?.total_weighted_marks_obtained).toBe(12 + 13.5 + 21); // 46.5 marks out of 60
      expect(summary.theory?.scaled_percentage).toBeCloseTo((46.5 / 60) * 100, 1); // 77.5%

      // Lab partition summary
      expect(summary.lab).toBeDefined();
      expect(summary.lab?.total_weightage_evaluated).toBe(40);
      expect(summary.lab?.total_weighted_marks_obtained).toBe(17 + 16); // 33 marks out of 40
      expect(summary.lab?.scaled_percentage).toBeCloseTo((33 / 40) * 100, 1); // 82.5%
    });
  });
});

