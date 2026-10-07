import { describe, it, expect } from 'vitest';
import {
  calculateAnnualDivision,
  SubjectMarksRecord,
  DEFAULT_DIVISION_THRESHOLDS,
} from '../annual-division';

describe('Annual Division Engine', () => {
  it('correctly categorizes First Class with Distinction (>= 75%)', () => {
    const subjects: SubjectMarksRecord[] = [
      { subject_name: 'Anatomy', obtained_marks: 80, max_marks: 100, min_pass_marks: 50 },
      { subject_name: 'Physiology', obtained_marks: 75, max_marks: 100, min_pass_marks: 50 },
      { subject_name: 'Biochemistry', obtained_marks: 76, max_marks: 100, min_pass_marks: 50 },
    ];

    const result = calculateAnnualDivision(subjects, DEFAULT_DIVISION_THRESHOLDS);
    expect(result.total_obtained).toBe(231);
    expect(result.total_max).toBe(300);
    expect(result.percentage).toBe(77.0);
    expect(result.division_name).toBe('First Class with Distinction');
    expect(result.is_all_passed).toBe(true);
    expect(result.failed_subjects).toHaveLength(0);
  });

  it('correctly categorizes First Class (>= 60%)', () => {
    const subjects: SubjectMarksRecord[] = [
      { subject_name: 'Paper 1', obtained_marks: 65, max_marks: 100, min_pass_marks: 40 },
      { subject_name: 'Paper 2', obtained_marks: 60, max_marks: 100, min_pass_marks: 40 },
    ];

    const result = calculateAnnualDivision(subjects, DEFAULT_DIVISION_THRESHOLDS);
    expect(result.percentage).toBe(62.5);
    expect(result.division_name).toBe('First Class');
    expect(result.is_all_passed).toBe(true);
  });

  it('marks as Fail / Arrear if any subject is below minimum pass mark', () => {
    const subjects: SubjectMarksRecord[] = [
      // High score in paper 1
      { subject_name: 'Paper 1', obtained_marks: 90, max_marks: 100, min_pass_marks: 40 },
      // Failed paper 2 (35 < 40)
      { subject_name: 'Paper 2', obtained_marks: 35, max_marks: 100, min_pass_marks: 40 },
    ];

    const result = calculateAnnualDivision(subjects, DEFAULT_DIVISION_THRESHOLDS);
    // Total is 125/200 = 62.5% (which would be First Class if passed), but failed paper 2!
    expect(result.division_name).toBe('Fail / Arrear');
    expect(result.is_all_passed).toBe(false);
    expect(result.failed_subjects).toEqual(['Paper 2']);
  });
});

