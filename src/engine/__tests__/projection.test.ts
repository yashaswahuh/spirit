import { describe, it, expect } from 'vitest';
import {
  calculateAttendanceProjection,
  countRemainingScheduledClasses,
} from '../projection';
import { TimetableSlot, CalendarEvent } from '../../types';

describe('Projection Engine', () => {
  describe('calculateAttendanceProjection', () => {
    it('computes best and worst case projections when threshold is reachable', () => {
      // 15 attended, 20 conducted, 10 remaining classes, threshold 75%
      // Total projected = 30
      // Best case: (15 + 10) / 30 = 25 / 30 = 83.33%
      // Worst case: 15 / 30 = 50.0%
      // Classes needed: ceil(0.75 * 30 - 15) = ceil(22.5 - 15) = 8
      const result = calculateAttendanceProjection({
        attended: 15,
        conducted: 20,
        threshold: 75,
        remainingClasses: 10,
      });

      expect(result.total_projected_classes).toBe(30);
      expect(result.best_case_percentage).toBeCloseTo(83.33, 1);
      expect(result.worst_case_percentage).toBe(50.0);
      expect(result.classes_needed_to_finish_at_threshold).toBe(8);
      expect(result.can_meet_threshold).toBe(true);
    });

    it('identifies when threshold is mathematically impossible to reach', () => {
      // 10 attended, 20 conducted, 5 remaining classes, threshold 75%
      // Total projected = 25
      // Best case: (10 + 5) / 25 = 15 / 25 = 60.0% (< 75%)
      // Classes needed: ceil(0.75 * 25 - 10) = ceil(18.75 - 10) = 9
      // Needed 9 but only 5 remaining!
      const result = calculateAttendanceProjection({
        attended: 10,
        conducted: 20,
        threshold: 75,
        remainingClasses: 5,
      });

      expect(result.total_projected_classes).toBe(25);
      expect(result.best_case_percentage).toBe(60.0);
      expect(result.classes_needed_to_finish_at_threshold).toBe(9);
      expect(result.can_meet_threshold).toBe(false);
    });

    it('handles zero remaining classes', () => {
      const result = calculateAttendanceProjection({
        attended: 16,
        conducted: 20,
        threshold: 75,
        remainingClasses: 0,
      });

      expect(result.total_projected_classes).toBe(20);
      expect(result.best_case_percentage).toBe(80.0);
      expect(result.worst_case_percentage).toBe(80.0);
      expect(result.classes_needed_to_finish_at_threshold).toBe(0);
      expect(result.can_meet_threshold).toBe(true);
    });

    it('handles zero total classes', () => {
      const result = calculateAttendanceProjection({
        attended: 0,
        conducted: 0,
        threshold: 75,
        remainingClasses: 0,
      });

      expect(result.total_projected_classes).toBe(0);
      expect(result.best_case_percentage).toBe(100.0);
      expect(result.can_meet_threshold).toBe(true);
    });
  });

  describe('countRemainingScheduledClasses', () => {
    // 2026-10-05 is Monday, 2026-10-09 is Friday, 2026-10-10 is Saturday
    const courseId = 'course-cs101';

    const slots: TimetableSlot[] = [
      // Monday (1) has 2 slots
      { id: 's1', user_id: 'u1', course_id: courseId, weekday: 1, start_time: '09:00', end_time: '10:00', room: '101', component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
      { id: 's2', user_id: 'u1', course_id: courseId, weekday: 1, start_time: '14:00', end_time: '15:00', room: '101', component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
      // Wednesday (3) has 1 slot
      { id: 's3', user_id: 'u1', course_id: courseId, weekday: 3, start_time: '10:00', end_time: '11:00', room: '101', component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
    ];

    it('counts regular weekly slots correctly', () => {
      // Oct 5 (Mon) to Oct 9 (Fri) 2026
      // Monday has 2 slots, Wednesday has 1 slot -> Total = 3 slots
      const count = countRemainingScheduledClasses(
        courseId,
        '2026-10-05',
        '2026-10-09',
        slots,
        []
      );
      expect(count).toBe(3);
    });

    it('excludes holidays from remaining count', () => {
      // Oct 7 (Wed) is a holiday
      const events: CalendarEvent[] = [
        { id: 'e1', user_id: 'u1', date: '2026-10-07', type: 'holiday', swap_target_weekday: null, note: 'Mid-term Holiday', created_at: '', updated_at: '', deleted_at: null },
      ];

      const count = countRemainingScheduledClasses(
        courseId,
        '2026-10-05',
        '2026-10-09',
        slots,
        events
      );
      // Wednesday slot excluded -> remaining Monday's 2 slots only
      expect(count).toBe(2);
    });

    it('handles swap days (e.g. Saturday follows Monday timetable)', () => {
      // Oct 10 2026 is Saturday. Set swap day to follow Monday (1) timetable
      const events: CalendarEvent[] = [
        { id: 'e2', user_id: 'u1', date: '2026-10-10', type: 'swap_day', swap_target_weekday: 1, note: 'Follow Monday Schedule', created_at: '', updated_at: '', deleted_at: null },
      ];

      // From Oct 10 to Oct 10
      const count = countRemainingScheduledClasses(
        courseId,
        '2026-10-10',
        '2026-10-10',
        slots,
        events
      );
      // Saturday gets Monday's 2 slots
      expect(count).toBe(2);
    });
  });
});

