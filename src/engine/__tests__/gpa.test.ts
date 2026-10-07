import { describe, it, expect } from 'vitest';
import {
  calculateSgpa,
  calculateCgpa,
  convertCgpaToPercentage,
  applyRounding,
  calculateRequiredSgpaForTarget,
  CourseAttemptRecord,
} from '../gpa';
import { CourseGradeCreditInput } from '../../types';

describe('GPA & CGPA Engine', () => {
  describe('calculateSgpa', () => {
    it('calculates weighted SGPA correctly', () => {
      // Course 1: 4 credits * 9.0 (A+) = 36
      // Course 2: 3 credits * 8.0 (A)  = 24
      // Course 3: 3 credits * 7.0 (B+) = 21
      // Total points = 81. Total credits = 10.
      // SGPA = 81 / 10 = 8.1
      const courses: CourseGradeCreditInput[] = [
        { credits: 4, grade_points: 9.0, counts_toward_gpa: true },
        { credits: 3, grade_points: 8.0, counts_toward_gpa: true },
        { credits: 3, grade_points: 7.0, counts_toward_gpa: true },
      ];

      const result = calculateSgpa(courses);
      expect(result.sgpa).toBe(8.1);
      expect(result.total_credits).toBe(10);
      expect(result.gpa_credits).toBe(10);
    });

    it('excludes audit courses from SGPA points but includes in total credits', () => {
      const courses: CourseGradeCreditInput[] = [
        { credits: 4, grade_points: 10.0, counts_toward_gpa: true },
        // Audit course (e.g. Environmental Studies)
        { credits: 2, grade_points: 0.0, counts_toward_gpa: false },
      ];

      const result = calculateSgpa(courses);
      expect(result.sgpa).toBe(10.0);
      expect(result.gpa_credits).toBe(4);
      expect(result.total_credits).toBe(6);
    });

    it('handles zero total credits safely', () => {
      const result = calculateSgpa([]);
      expect(result.sgpa).toBe(0.0);
      expect(result.total_credits).toBe(0);
    });
  });

  describe('calculateCgpa with Backlog & Repeat Handling', () => {
    it('replaces old grade when repeat_handling is replace_old', () => {
      // Course CS101: Attempt 1 was 0.0 (Failed), Attempt 2 was 8.0 (Passed)
      // Course CS102: 4 credits, 9.0 (Passed first attempt)
      const attempts: CourseAttemptRecord[] = [
        { course_id: 'cs101', credits: 4, grade_points: 0.0, counts_toward_gpa: true, attempt_number: 1 },
        { course_id: 'cs101', credits: 4, grade_points: 8.0, counts_toward_gpa: true, attempt_number: 2 },
        { course_id: 'cs102', credits: 4, grade_points: 9.0, counts_toward_gpa: true, attempt_number: 1 },
      ];

      const result = calculateCgpa(attempts, { repeat_handling: 'replace_old' });
      // Evaluated courses = 2 (cs101 attempt 2 + cs102 attempt 1)
      // Credits = 4 + 4 = 8
      // Points = 4 * 8.0 + 4 * 9.0 = 32 + 36 = 68
      // CGPA = 68 / 8 = 8.5
      expect(result.cgpa).toBe(8.5);
      expect(result.total_gpa_credits).toBe(8);
      expect(result.evaluated_courses_count).toBe(2);
    });

    it('keeps best grade when repeat_handling is keep_best', () => {
      // Improvement exam where second attempt was lower
      const attempts: CourseAttemptRecord[] = [
        { course_id: 'cs201', credits: 3, grade_points: 8.0, counts_toward_gpa: true, attempt_number: 1 },
        { course_id: 'cs201', credits: 3, grade_points: 6.0, counts_toward_gpa: true, attempt_number: 2 },
      ];

      const resultKeepBest = calculateCgpa(attempts, { repeat_handling: 'keep_best' });
      expect(resultKeepBest.cgpa).toBe(8.0);

      const resultReplaceOld = calculateCgpa(attempts, { repeat_handling: 'replace_old' });
      expect(resultReplaceOld.cgpa).toBe(6.0);
    });
  });

  describe('convertCgpaToPercentage', () => {
    it('uses standard multiplier formula (e.g. 9.5 for CBSE/AICTE)', () => {
      // 8.0 * 9.5 = 76.0%
      expect(convertCgpaToPercentage(8.0, { rule_type: 'multiplier', multiplier: 9.5 })).toBe(76.0);
      // 10.0 multiplier
      expect(convertCgpaToPercentage(8.5, { rule_type: 'multiplier', multiplier: 10.0 })).toBe(85.0);
    });

    it('evaluates custom formula expressions (e.g. VTU (CGPA - 0.75) * 10)', () => {
      // VTU formula: (cgpa - 0.75) * 10
      // For CGPA = 8.25: (8.25 - 0.75) * 10 = 7.5 * 10 = 75.0%
      const vtuRule = {
        rule_type: 'custom_formula' as const,
        formula_expression: '((cgpa - 0.75) * 10)',
      };
      expect(convertCgpaToPercentage(8.25, vtuRule)).toBe(75.0);
    });

    it('safely falls back if custom formula is malformed', () => {
      const badRule = {
        rule_type: 'custom_formula' as const,
        formula_expression: 'invalid / expression %%',
      };
      // Falls back to multiplier default (8.0 * 9.5 = 76.0)
      expect(convertCgpaToPercentage(8.0, badRule)).toBe(76.0);
    });
  });

  describe('applyRounding', () => {
    it('supports round, floor, and ceil modes with configurable precision', () => {
      expect(applyRounding(8.256, { precision: 2, mode: 'round' })).toBe(8.26);
      expect(applyRounding(8.256, { precision: 2, mode: 'floor' })).toBe(8.25);
      expect(applyRounding(8.251, { precision: 2, mode: 'ceil' })).toBe(8.26);
      expect(applyRounding(8.256, { precision: 1, mode: 'round' })).toBe(8.3);
    });
  });

  describe('Special Grades Handling in SGPA', () => {
    it('handles AB (absent), W (withdrawn), and I (incomplete) accurately', () => {
      const courses: CourseGradeCreditInput[] = [
        // Graded course: 4 credits, 8.0 points -> 32
        { credits: 4, grade_points: 8.0, counts_toward_gpa: true },
        // Absent course: 4 credits, AB -> 0 points, counted in GPA -> 0 points
        { credits: 4, letter_grade: 'AB', grade_points: null, counts_toward_gpa: true },
        // Withdrawn course: 3 credits, W -> completely excluded from GPA and credits
        { credits: 3, letter_grade: 'W', grade_points: null, counts_toward_gpa: true },
        // Incomplete course: 2 credits, I -> excluded from GPA until completed
        { credits: 2, letter_grade: 'I', grade_points: null, counts_toward_gpa: true },
      ];

      const result = calculateSgpa(courses);
      // Evaluated GPA credits = 4 (first) + 4 (AB) = 8 credits
      // Points = 32 + 0 = 32
      // SGPA = 32 / 8 = 4.0
      expect(result.sgpa).toBe(4.0);
      expect(result.gpa_credits).toBe(8);
      // Total credits (excluding W) = 4 + 4 + 2 = 10
      expect(result.total_credits).toBe(10);
    });
  });

  describe('Lateral Entry in CGPA', () => {
    it('skips terms prior to entry term (e.g. Terms 1 and 2 for lateral entry starting at Term 3)', () => {
      const attempts: CourseAttemptRecord[] = [
        // Term 1 & 2 legacy dummy courses or transferred courses
        { course_id: 't1_course', credits: 4, grade_points: 5.0, counts_toward_gpa: true, attempt_number: 1, term_number: 1 },
        { course_id: 't2_course', credits: 4, grade_points: 5.0, counts_toward_gpa: true, attempt_number: 1, term_number: 2 },
        // Term 3 (Lateral Entry Start)
        { course_id: 't3_course', credits: 4, grade_points: 9.0, counts_toward_gpa: true, attempt_number: 1, term_number: 3 },
        { course_id: 't4_course', credits: 4, grade_points: 9.0, counts_toward_gpa: true, attempt_number: 1, term_number: 4 },
      ];

      const result = calculateCgpa(attempts, {
        repeat_handling: 'replace_old',
        entry_term: 3,
      });

      // Only term 3 and term 4 are evaluated
      // Credits = 8, Points = 36 + 36 = 72, CGPA = 9.0
      expect(result.cgpa).toBe(9.0);
      expect(result.total_gpa_credits).toBe(8);
      expect(result.evaluated_courses_count).toBe(2);
    });
  });

  describe('calculateRequiredSgpaForTarget', () => {
    it('calculates achievable required SGPA in remaining credits', () => {
      // Current CGPA = 7.5 over 60 credits. Target CGPA = 8.0 with 20 credits remaining.
      // Total = 80 credits. Needed points = 80 * 8.0 = 640. Current points = 60 * 7.5 = 450.
      // Remaining needed = 640 - 450 = 190 over 20 credits -> 190 / 20 = 9.5 SGPA
      const res = calculateRequiredSgpaForTarget({
        currentCgpa: 7.5,
        completedCredits: 60,
        targetCgpa: 8.0,
        remainingCredits: 20,
        maxPoint: 10.0,
      });

      expect(res.isAchievable).toBe(true);
      expect(res.requiredSgpa).toBe(9.5);
    });

    it('detects mathematically impossible target exceeding maxPoint scale', () => {
      // Current CGPA = 6.0 over 80 credits. Target CGPA = 8.5 with only 10 credits remaining.
      const res = calculateRequiredSgpaForTarget({
        currentCgpa: 6.0,
        completedCredits: 80,
        targetCgpa: 8.5,
        remainingCredits: 10,
        maxPoint: 10.0,
      });

      expect(res.isAchievable).toBe(false);
      expect(res.requiredSgpa).toBeGreaterThan(10.0);
      expect(res.reason).toContain('exceeds the maximum scale limit');
    });
  });
});

