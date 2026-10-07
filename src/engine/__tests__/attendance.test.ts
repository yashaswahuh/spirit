import { describe, it, expect } from 'vitest';
import {
  calculateAttendancePercentage,
  calculateSafeBunks,
  calculateMustAttend,
  computeCourseAttendanceStats,
  normalizeThreshold,
  countUnmarkedClasses,
} from '../attendance';
import { AttendanceRecord, CourseAttendanceRules } from '../../types';

describe('Attendance Engine', () => {
  describe('normalizeThreshold', () => {
    it('normalizes percentage inputs to fraction', () => {
      expect(normalizeThreshold(75)).toBeCloseTo(0.75);
      expect(normalizeThreshold(80)).toBeCloseTo(0.8);
      expect(normalizeThreshold(100)).toBe(1.0);
    });

    it('keeps fractional inputs unchanged', () => {
      expect(normalizeThreshold(0.75)).toBe(0.75);
      expect(normalizeThreshold(0.85)).toBe(0.85);
    });

    it('guards against zero or negative values', () => {
      expect(normalizeThreshold(0)).toBe(0.01);
      expect(normalizeThreshold(-10)).toBe(0.01);
    });
  });

  describe('calculateAttendancePercentage', () => {
    it('returns 100% when no classes conducted', () => {
      expect(calculateAttendancePercentage(0, 0)).toBe(100.0);
    });

    it('computes accurate percentages', () => {
      expect(calculateAttendancePercentage(15, 20)).toBe(75.0);
      expect(calculateAttendancePercentage(18, 20)).toBe(90.0);
      expect(calculateAttendancePercentage(0, 10)).toBe(0.0);
    });

    it('bounds output between 0 and 100', () => {
      expect(calculateAttendancePercentage(25, 20)).toBe(100.0);
    });
  });

  describe('calculateSafeBunks (floor(attended/t - conducted))', () => {
    it('calculates exact safe bunks when student is above threshold', () => {
      // 18 attended, 20 conducted, threshold 75%
      // 18 / 0.75 = 24. 24 - 20 = 4 safe bunks.
      // Verification: 18 / (20 + 4) = 18 / 24 = 75.0%
      expect(calculateSafeBunks(18, 20, 75)).toBe(4);
      expect(calculateSafeBunks(18, 20, 0.75)).toBe(4);
    });

    it('returns 0 when student is exactly at threshold', () => {
      // 15 attended, 20 conducted -> 75%
      // 15 / 0.75 = 20. 20 - 20 = 0.
      expect(calculateSafeBunks(15, 20, 75)).toBe(0);
    });

    it('returns 0 when student is below threshold', () => {
      // 14 attended, 20 conducted -> 70% (< 75%)
      expect(calculateSafeBunks(14, 20, 75)).toBe(0);
    });

    it('handles edge case of zero classes conducted or attended', () => {
      expect(calculateSafeBunks(0, 0, 75)).toBe(0);
      expect(calculateSafeBunks(0, 5, 75)).toBe(0);
    });

    it('calculates safe bunks for high attendance and 85% threshold', () => {
      // 45 attended, 48 conducted (93.75%), threshold 85%
      // 45 / 0.85 = 52.94 -> floor is 52. 52 - 48 = 4 safe bunks.
      // Verification: 45 / (48 + 4) = 45 / 52 = 86.5% >= 85%
      // If 5 skipped: 45 / 53 = 84.9% < 85%
      expect(calculateSafeBunks(45, 48, 85)).toBe(4);
    });
  });

  describe('calculateMustAttend (ceil((t*conducted - attended)/(1-t)))', () => {
    it('returns 0 when student is already at or above threshold', () => {
      expect(calculateMustAttend(15, 20, 75)).toBe(0);
      expect(calculateMustAttend(18, 20, 75)).toBe(0);
    });

    it('returns 0 when no classes conducted', () => {
      expect(calculateMustAttend(0, 0, 75)).toBe(0);
    });

    it('calculates exact classes to attend when below threshold', () => {
      // 14 attended, 20 conducted (70%), threshold 75%
      // (0.75 * 20 - 14) / (1 - 0.75) = (15 - 14) / 0.25 = 4
      // Verification: (14 + 4) / (20 + 4) = 18 / 24 = 75.0%
      expect(calculateMustAttend(14, 20, 75)).toBe(4);
      expect(calculateMustAttend(14, 20, 0.75)).toBe(4);
    });

    it('handles fractional ceilings correctly', () => {
      // 10 attended, 20 conducted (50%), threshold 75%
      // (0.75 * 20 - 10) / 0.25 = (15 - 10) / 0.25 = 20
      // Verification: (10 + 20) / (20 + 20) = 30 / 40 = 75.0%
      expect(calculateMustAttend(10, 20, 75)).toBe(20);
    });

    it('handles 100% threshold (t = 1.0) edge cases', () => {
      // Perfect attendance: 10 / 10 -> needs 0
      expect(calculateMustAttend(10, 10, 100)).toBe(0);

      // Missed at least one class: 9 / 10 -> mathematically impossible to reach 100%
      expect(calculateMustAttend(9, 10, 100)).toBe(Infinity);
    });
  });

  describe('computeCourseAttendanceStats with record log', () => {
    const rulesAllCount: CourseAttendanceRules = {
      medical_counts_as_present: true,
      duty_leave_counts_as_present: true,
    };

    const rulesStrict: CourseAttendanceRules = {
      medical_counts_as_present: false,
      duty_leave_counts_as_present: false,
    };

    const mockRecords: AttendanceRecord[] = [
      { id: '1', user_id: 'u1', course_id: 'c1', date: '2026-09-01', slot_id: null, status: 'present', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '2', user_id: 'u1', course_id: 'c1', date: '2026-09-02', slot_id: null, status: 'present', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '3', user_id: 'u1', course_id: 'c1', date: '2026-09-03', slot_id: null, status: 'absent', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '4', user_id: 'u1', course_id: 'c1', date: '2026-09-04', slot_id: null, status: 'medical', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '5', user_id: 'u1', course_id: 'c1', date: '2026-09-05', slot_id: null, status: 'duty_leave', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '6', user_id: 'u1', course_id: 'c1', date: '2026-09-06', slot_id: null, status: 'cancelled', note: null, created_at: '', updated_at: '', deleted_at: null },
      { id: '7', user_id: 'u1', course_id: 'c1', date: '2026-09-07', slot_id: null, status: 'holiday', note: null, created_at: '', updated_at: '', deleted_at: null },
      // Soft deleted record should be ignored
      { id: '8', user_id: 'u1', course_id: 'c1', date: '2026-09-08', slot_id: null, status: 'absent', note: null, created_at: '', updated_at: '', deleted_at: '2026-09-08T10:00:00Z' },
    ];

    it('correctly excludes cancelled and holiday from conducted count', () => {
      const stats = computeCourseAttendanceStats(mockRecords, rulesAllCount, 75);
      // Conducted = 5 (2 present + 1 absent + 1 medical + 1 duty_leave). Cancelled & holiday excluded.
      expect(stats.conducted).toBe(5);
    });

    it('counts medical and duty leave as present when rules allow', () => {
      const stats = computeCourseAttendanceStats(mockRecords, rulesAllCount, 75);
      // Attended = 2 (present) + 1 (medical) + 1 (duty) = 4
      // Conducted = 5
      // 4 / 5 = 80.0%
      expect(stats.attended).toBe(4);
      expect(stats.percentage).toBe(80.0);
      expect(stats.is_in_danger).toBe(false);
    });

    it('treats medical and duty leave as conducted-only when rules disallow', () => {
      const stats = computeCourseAttendanceStats(mockRecords, rulesStrict, 75);
      // Attended = 2 (present only)
      // Conducted = 5
      // 2 / 5 = 40.0%
      expect(stats.attended).toBe(2);
      expect(stats.conducted).toBe(5);
      expect(stats.percentage).toBe(40.0);
      expect(stats.is_in_danger).toBe(true);
      expect(stats.must_attend).toBeGreaterThan(0);
    });

    it('incorporates opening balance into attendance stats', () => {
      // Starting mid-semester with 20 conducted, 18 attended from college portal
      const stats = computeCourseAttendanceStats(
        [
          { id: '10', user_id: 'u1', course_id: 'c1', date: '2026-10-01', slot_id: null, status: 'present', note: null, created_at: '', updated_at: '', deleted_at: null },
          { id: '11', user_id: 'u1', course_id: 'c1', date: '2026-10-02', slot_id: null, status: 'absent', note: null, created_at: '', updated_at: '', deleted_at: null },
        ],
        rulesStrict,
        75,
        {
          initialAttended: 18,
          initialConducted: 20,
        }
      );

      // Total attended: 18 + 1 = 19
      // Total conducted: 20 + 2 = 22
      // 19 / 22 = 86.36%
      expect(stats.attended).toBe(19);
      expect(stats.conducted).toBe(22);
      expect(stats.percentage).toBeCloseTo(86.36, 1);
      expect(stats.safe_bunks).toBe(3);
    });

    it('skips records prior to trackingStartDate when opening balance is active', () => {
      const recordsWithOld: AttendanceRecord[] = [
        { id: 'old1', user_id: 'u1', course_id: 'c1', date: '2026-09-10', slot_id: null, status: 'absent', note: null, created_at: '', updated_at: '', deleted_at: null },
        { id: 'new1', user_id: 'u1', course_id: 'c1', date: '2026-10-05', slot_id: null, status: 'present', note: null, created_at: '', updated_at: '', deleted_at: null },
      ];

      const stats = computeCourseAttendanceStats(
        recordsWithOld,
        rulesStrict,
        75,
        {
          initialAttended: 15,
          initialConducted: 15,
          trackingStartDate: '2026-10-01',
        }
      );

      // Old record from 2026-09-10 is ignored
      // Total attended: 15 + 1 = 16
      // Total conducted: 15 + 1 = 16
      expect(stats.attended).toBe(16);
      expect(stats.conducted).toBe(16);
      expect(stats.percentage).toBe(100.0);
    });

    it('multiplies attendance increments by slot weight (e.g. 2-period lab)', () => {
      const labRecords: AttendanceRecord[] = [
        { id: 'lab1', user_id: 'u1', course_id: 'c1', date: '2026-10-05', slot_id: null, status: 'present', weight: 2, note: null, created_at: '', updated_at: '', deleted_at: null },
        { id: 'lab2', user_id: 'u1', course_id: 'c1', date: '2026-10-12', slot_id: null, status: 'absent', weight: 3, note: null, created_at: '', updated_at: '', deleted_at: null },
      ];

      const stats = computeCourseAttendanceStats(labRecords, rulesStrict, 75);
      // Attended: 2 periods
      // Conducted: 2 + 3 = 5 periods
      // 2 / 5 = 40%
      expect(stats.attended).toBe(2);
      expect(stats.conducted).toBe(5);
      expect(stats.percentage).toBe(40.0);
    });

    it('computes distinct theory vs lab breakdown stats for integrated theory_and_lab courses', () => {
      const mixedRecords: AttendanceRecord[] = [
        // 3 theory lectures (weight 1 each): 2 present, 1 absent
        { id: 'r1', user_id: 'u1', course_id: 'c1', date: '2026-10-05', slot_id: null, status: 'present', weight: 1, component_type: 'theory', note: null, created_at: '', updated_at: '', deleted_at: null },
        { id: 'r2', user_id: 'u1', course_id: 'c1', date: '2026-10-06', slot_id: null, status: 'present', weight: 1, component_type: 'theory', note: null, created_at: '', updated_at: '', deleted_at: null },
        { id: 'r3', user_id: 'u1', course_id: 'c1', date: '2026-10-07', slot_id: null, status: 'absent', weight: 1, component_type: 'theory', note: null, created_at: '', updated_at: '', deleted_at: null },
        // 1 lab session (weight 2): present
        { id: 'r4', user_id: 'u1', course_id: 'c1', date: '2026-10-08', slot_id: null, status: 'present', weight: 2, component_type: 'lab', note: null, created_at: '', updated_at: '', deleted_at: null },
      ];

      const stats = computeCourseAttendanceStats(mixedRecords, rulesStrict, 75);
      // Overall: 2 (theory) + 2 (lab) = 4 attended out of 3 + 2 = 5 conducted (80%)
      expect(stats.attended).toBe(4);
      expect(stats.conducted).toBe(5);
      expect(stats.percentage).toBe(80.0);

      // Theory breakdown: 2 attended, 3 conducted (66.67%)
      expect(stats.theory).toBeDefined();
      expect(stats.theory?.attended).toBe(2);
      expect(stats.theory?.conducted).toBe(3);
      expect(stats.theory?.percentage).toBeCloseTo(66.7, 1);

      // Lab breakdown: 2 attended, 2 conducted (100%)
      expect(stats.lab).toBeDefined();
      expect(stats.lab?.attended).toBe(2);
      expect(stats.lab?.conducted).toBe(2);
      expect(stats.lab?.percentage).toBe(100.0);
    });
  });

  describe('countUnmarkedClasses', () => {
    it('accurately counts unmarked classes in the past and ignores marked ones', () => {
      const slots: any[] = [
        { id: 's1', course_id: 'c1', weekday: 1, start_time: '09:00', end_time: '10:00', weight: 1, deleted_at: null },
        { id: 's2', course_id: 'c2', weekday: 1, start_time: '10:00', end_time: '11:00', weight: 2, deleted_at: null },
      ];

      // Monday 2026-10-05 has both s1 and s2 (total 1 + 2 = 3 periods)
      // If s1 is marked, only s2 remains unmarked (weight 2)
      const records: any[] = [
        { id: 'r1', course_id: 'c1', date: '2026-10-05', slot_id: 's1', status: 'present', deleted_at: null },
      ];

      const count = countUnmarkedClasses({
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        slots,
        records,
        courses: [{ id: 'c1' }, { id: 'c2' }],
      });

      expect(count).toBe(2); // s2 weight is 2
    });
  });
});


