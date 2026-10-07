import { describe, it, expect } from 'vitest';
import {
  simulateSkippingClasses,
  simulateSkippingDates,
  canISkipTomorrow,
  SubjectAttendanceState,
} from '../whatif';
import { TimetableSlot, CalendarEvent } from '../../types';

describe('What-If Attendance Simulator', () => {
  const subjects: SubjectAttendanceState[] = [
    {
      course_id: 'c1',
      course_name: 'Mathematics',
      attended: 18,
      conducted: 20, // 90%
      threshold: 75,
    },
    {
      course_id: 'c2',
      course_name: 'Physics',
      attended: 15,
      conducted: 20, // 75% (exactly on edge)
      threshold: 75,
    },
  ];

  it('correctly simulates skipping specific classes per course', () => {
    // Skip 1 Math class and 1 Physics class
    const result = simulateSkippingClasses(subjects, {
      c1: 1,
      c2: 1,
    });

    expect(result.total_classes_skipped).toBe(2);

    // Math: 18 / 21 = 85.7% (still safe >= 75%)
    const math = result.impacts.find(i => i.course_id === 'c1')!;
    expect(math.new_percentage).toBeCloseTo(85.71, 1);
    expect(math.remains_safe).toBe(true);

    // Physics: 15 / 21 = 71.4% (drops into danger < 75%)
    const physics = result.impacts.find(i => i.course_id === 'c2')!;
    expect(physics.new_percentage).toBeCloseTo(71.43, 1);
    expect(physics.remains_safe).toBe(false);
    expect(physics.new_must_attend).toBeGreaterThan(0);

    // Only physics dropped into danger
    expect(result.courses_in_danger_count).toBe(1);
  });

  it('simulates skipping whole dates with timetable slots and holidays', () => {
    // 2026-10-05 is Monday
    const slots: TimetableSlot[] = [
      { id: 's1', user_id: 'u1', course_id: 'c1', weekday: 1, start_time: '09:00', end_time: '10:00', room: null, component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
      { id: 's2', user_id: 'u1', course_id: 'c2', weekday: 1, start_time: '11:00', end_time: '12:00', room: null, component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
    ];

    // Simulate skipping Monday
    const result = simulateSkippingDates(
      ['2026-10-05'],
      subjects,
      slots,
      []
    );

    expect(result.total_classes_skipped).toBe(2);
    const math = result.impacts.find(i => i.course_id === 'c1')!;
    const physics = result.impacts.find(i => i.course_id === 'c2')!;
    expect(math.classes_skipped).toBe(1);
    expect(physics.classes_skipped).toBe(1);
  });

  it('skipping a calendar holiday causes zero missed classes', () => {
    const slots: TimetableSlot[] = [
      { id: 's1', user_id: 'u1', course_id: 'c1', weekday: 1, start_time: '09:00', end_time: '10:00', room: null, component_type: 'theory', created_at: '', updated_at: '', deleted_at: null },
    ];

    const events: CalendarEvent[] = [
      { id: 'e1', user_id: 'u1', date: '2026-10-05', type: 'holiday', swap_target_weekday: null, note: 'Gandhi Jayanti observed', created_at: '', updated_at: '', deleted_at: null },
    ];

    const result = simulateSkippingDates(
      ['2026-10-05'],
      subjects,
      slots,
      events
    );

    expect(result.total_classes_skipped).toBe(0);
  });

  describe('canISkipTomorrow', () => {
    const slots: TimetableSlot[] = [
      { id: 's1', user_id: 'u1', course_id: 'c1', weekday: 1, start_time: '09:00', end_time: '10:00', room: null, component_type: 'theory', weight: 1, created_at: '', updated_at: '', deleted_at: null },
      { id: 's2', user_id: 'u1', course_id: 'c2', weekday: 1, start_time: '10:00', end_time: '11:00', room: null, component_type: 'theory', weight: 1, created_at: '', updated_at: '', deleted_at: null },
    ];

    it('reports cannot skip all when any subject would drop below threshold', () => {
      // On Monday 2026-10-05: Math is 90% (safe), Physics is 75% (will drop to 71.4%)
      const tomorrowResult = canISkipTomorrow('2026-10-05', subjects, {
        slots,
        calendarEvents: [],
        workingDays: [1, 2, 3, 4, 5, 6],
      });

      expect(tomorrowResult.has_classes).toBe(true);
      expect(tomorrowResult.can_skip_all).toBe(false);
      expect(tomorrowResult.in_danger_courses_count).toBe(1);

      const mathStatus = tomorrowResult.subjects.find(s => s.course_id === 'c1')!;
      const physicsStatus = tomorrowResult.subjects.find(s => s.course_id === 'c2')!;

      expect(mathStatus.can_skip).toBe(true);
      expect(physicsStatus.can_skip).toBe(false);
    });

    it('reports can skip all when tomorrow is a holiday', () => {
      const holidayEvent: CalendarEvent = {
        id: 'h1',
        user_id: 'u1',
        date: '2026-10-05',
        type: 'holiday',
        swap_target_weekday: null,
        note: 'State Holiday',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      };

      const tomorrowResult = canISkipTomorrow('2026-10-05', subjects, {
        slots,
        calendarEvents: [holidayEvent],
      });

      expect(tomorrowResult.is_holiday).toBe(true);
      expect(tomorrowResult.can_skip_all).toBe(true);
      expect(tomorrowResult.has_classes).toBe(false);
    });
  });
});


