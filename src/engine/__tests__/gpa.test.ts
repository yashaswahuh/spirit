import { describe, it, expect } from 'vitest';
import {
  calculateSgpa,
  calculateCgpa,
  convertCgpaToPercentage,
  applyRounding,
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
});

