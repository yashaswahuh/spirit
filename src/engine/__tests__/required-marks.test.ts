import { describe, it, expect } from 'vitest';
import { calculateRequiredEndSemMarks } from '../required-marks';

describe('Required End-Sem Marks Solver', () => {
  it('calculates required end-sem marks to achieve target course percentage', () => {
    // Internal: 30 out of 40 (75%), weightage 40% -> contributes 30% to total
    // End-sem: max 100, weightage 60%
    // Target: 60% total (First class / Grade B)
    // Needed from end-sem: 60% - 30% = 30%
    // Required raw marks = (30 / 60) * 100 = 50 marks
    const result = calculateRequiredEndSemMarks({
      internal_obtained: 30,
      internal_max: 40,
      internal_weightage: 40,
      end_sem_max: 100,
      end_sem_weightage: 60,
      target_total_percentage: 60,
    });

    expect(result.is_achievable).toBe(true);
    expect(result.required_raw_marks).toBe(50);
    expect(result.required_percentage).toBe(50);
  });

  it('enforces separate minimum end-sem passing requirement', () => {
    // Student scored high internal marks: 38 out of 40 (weightage 40% -> contributes 38%)
    // Target is just 50% (pass mark)
    // Mathematically, only 12% needed from end-sem -> (12 / 60) * 100 = 20 marks
    // But university requires minimum 35 marks in the end-sem paper itself to pass!
    const result = calculateRequiredEndSemMarks({
      internal_obtained: 38,
      internal_max: 40,
      internal_weightage: 40,
      end_sem_max: 100,
      end_sem_weightage: 60,
      target_total_percentage: 50,
      end_sem_min_pass_marks: 35,
    });

    expect(result.is_achievable).toBe(true);
    // Overridden by minimum end-sem threshold
    expect(result.required_raw_marks).toBe(35);
  });

  it('detects when the target grade is mathematically impossible', () => {
    // Low internal marks: 10 out of 50 (weightage 50% -> contributes 10%)
    // Ambitious target: 90% (Outstanding / A+)
    // Needed from end-sem: 90% - 10% = 80%
    // (80 / 50) * 100 = 160 marks out of 100!
    const result = calculateRequiredEndSemMarks({
      internal_obtained: 10,
      internal_max: 50,
      internal_weightage: 50,
      end_sem_max: 100,
      end_sem_weightage: 50,
      target_total_percentage: 90,
    });

    expect(result.is_achievable).toBe(false);
    expect(result.limiting_reason).toBe('exceeds_max_marks');
    expect(result.required_raw_marks).toBeGreaterThan(100);
  });

  it('returns 0 when target is already achieved through internals alone', () => {
    // Internals: 50 out of 50 (weightage 50% -> contributes 50%)
    // Target: 40% (Pass mark)
    // No minimum end-sem mark set
    const result = calculateRequiredEndSemMarks({
      internal_obtained: 50,
      internal_max: 50,
      internal_weightage: 50,
      end_sem_max: 100,
      end_sem_weightage: 50,
      target_total_percentage: 40,
    });

    expect(result.is_achievable).toBe(true);
    expect(result.required_raw_marks).toBe(0);
  });
});

