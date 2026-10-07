import { describe, it, expect } from 'vitest';
import {
  detectSlotOverlaps,
  resolveEffectiveTimetableVersion,
  parsePastedHolidays,
  expandDateRange,
  resolveDaySchedule,
  timeToMinutes,
} from '../timetable';
import {
  TimetableSlot,
  TimetableVersion,
  TimetableOverride,
  CalendarEvent,
} from '../../types';

describe('Timetable Engine Unit Tests', () => {
  const dummyUUID = (n: number) => `00000000-0000-0000-0000-00000000000${n}`;

  describe('timeToMinutes', () => {
    it('converts HH:mm to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:00')).toBe(540);
      expect(timeToMinutes('09:55')).toBe(595);
      expect(timeToMinutes('14:30')).toBe(870);
    });
  });

  describe('detectSlotOverlaps', () => {
    it('identifies overlapping slots on same weekday', () => {
      const slots: TimetableSlot[] = [
        {
          id: dummyUUID(1),
          user_id: 'user1',
          course_id: 'c1',
          weekday: 1,
          start_time: '09:00',
          end_time: '10:00',
          room: '101',
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        {
          id: dummyUUID(2),
          user_id: 'user1',
          course_id: 'c2',
          weekday: 1,
          start_time: '09:30',
          end_time: '10:30',
          room: '102',
          component_type: 'lab',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
      ];

      const warnings = detectSlotOverlaps(slots);
      expect(warnings).toHaveLength(1);
      expect(warnings[0].message).toContain('Overlap between 09:00-10:00 and 09:30-10:30');
    });

    it('does not warn for adjacent/touching slots (09:00-10:00 and 10:00-11:00)', () => {
      const slots: TimetableSlot[] = [
        {
          id: dummyUUID(1),
          user_id: 'user1',
          course_id: 'c1',
          weekday: 1,
          start_time: '09:00',
          end_time: '10:00',
          room: null,
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        {
          id: dummyUUID(2),
          user_id: 'user1',
          course_id: 'c2',
          weekday: 1,
          start_time: '10:00',
          end_time: '11:00',
          room: null,
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
      ];

      expect(detectSlotOverlaps(slots)).toHaveLength(0);
    });

    it('does not warn for slots on different weekdays or soft-deleted slots', () => {
      const slots: TimetableSlot[] = [
        {
          id: dummyUUID(1),
          user_id: 'user1',
          course_id: 'c1',
          weekday: 1,
          start_time: '09:00',
          end_time: '10:00',
          room: null,
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        {
          id: dummyUUID(2),
          user_id: 'user1',
          course_id: 'c2',
          weekday: 2, // Different day
          start_time: '09:00',
          end_time: '10:00',
          room: null,
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        {
          id: dummyUUID(3),
          user_id: 'user1',
          course_id: 'c3',
          weekday: 1,
          start_time: '09:00',
          end_time: '10:00',
          room: null,
          component_type: 'theory',
          created_at: '',
          updated_at: '',
          deleted_at: '2026-09-01T00:00:00Z', // Deleted
        },
      ];

      expect(detectSlotOverlaps(slots)).toHaveLength(0);
    });
  });

  describe('resolveEffectiveTimetableVersion', () => {
    const versions: TimetableVersion[] = [
      {
        id: 'v1',
        user_id: 'u1',
        term_id: 't1',
        name: 'Initial Term Schedule',
        effective_from: '2026-08-01',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'v2',
        user_id: 'u1',
        term_id: 't1',
        name: 'Mid-Sem Revised Schedule',
        effective_from: '2026-10-01',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ];

    it('returns v1 for dates before v2', () => {
      const v = resolveEffectiveTimetableVersion(versions, '2026-09-15');
      expect(v?.id).toBe('v1');
    });

    it('returns v2 exactly on and after effective_from date', () => {
      expect(resolveEffectiveTimetableVersion(versions, '2026-10-01')?.id).toBe('v2');
      expect(resolveEffectiveTimetableVersion(versions, '2026-10-15')?.id).toBe('v2');
    });

    it('falls back to earliest version if date is prior to first version', () => {
      expect(resolveEffectiveTimetableVersion(versions, '2026-07-20')?.id).toBe('v1');
    });

    it('returns null if empty', () => {
      expect(resolveEffectiveTimetableVersion([], '2026-10-01')).toBeNull();
    });
  });

  describe('parsePastedHolidays', () => {
    it('parses multiple formats of pasted holiday text', () => {
      const text = `
        2026-08-15 Independence Day
        2026-10-02: Gandhi Jayanti
        2026-10-19 to 2026-10-23: Diwali Vacation
        25/12/2026 - Christmas Day
      `;

      const parsed = parsePastedHolidays(text);
      expect(parsed).toHaveLength(4);
      expect(parsed[0]).toEqual({ date: '2026-08-15', name: 'Independence Day' });
      expect(parsed[1]).toEqual({ date: '2026-10-02', name: 'Gandhi Jayanti' });
      expect(parsed[2]).toEqual({
        date: '2026-10-19',
        endDate: '2026-10-23',
        name: 'Diwali Vacation',
      });
      expect(parsed[3]).toEqual({ date: '2026-12-25', name: 'Christmas Day' });
    });
  });

  describe('expandDateRange', () => {
    it('expands inclusive date range to daily ISO dates', () => {
      const dates = expandDateRange('2026-10-01', '2026-10-04');
      expect(dates).toEqual(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04']);
    });

    it('handles single day range', () => {
      const dates = expandDateRange('2026-10-01', '2026-10-01');
      expect(dates).toEqual(['2026-10-01']);
    });
  });

  describe('resolveDaySchedule', () => {
    const baseSlots: TimetableSlot[] = [
      {
        id: 'slot-mon-1',
        user_id: 'u1',
        course_id: 'c-math',
        version_id: 'v1',
        weekday: 1, // Monday
        start_time: '09:00',
        end_time: '09:55',
        room: 'LH-1',
        faculty: 'Prof. Ramanujan',
        component_type: 'theory',
        weight: 1,
        period_name: 'P1',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
      {
        id: 'slot-mon-2',
        user_id: 'u1',
        course_id: 'c-physics-lab',
        version_id: 'v1',
        weekday: 1, // Monday
        start_time: '10:00',
        end_time: '11:55',
        room: 'Phy Lab 2',
        faculty: 'Dr. Bose',
        component_type: 'lab',
        weight: 2, // 2-period lab
        period_name: 'P2-P3',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ];

    const versions: TimetableVersion[] = [
      {
        id: 'v1',
        user_id: 'u1',
        term_id: 't1',
        name: 'Semester Timetable',
        effective_from: '2026-08-01',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ];

    it('resolves normal day schedule with slot weights', () => {
      // 2026-10-05 is a Monday
      const res = resolveDaySchedule({
        date: '2026-10-05',
        versions,
        slots: baseSlots,
        calendarEvents: [],
      });

      expect(res.is_working_day).toBe(true);
      expect(res.is_holiday).toBe(false);
      expect(res.slots).toHaveLength(2);
      expect(res.slots[0].course_id).toBe('c-math');
      expect(res.slots[0].weight).toBe(1);
      expect(res.slots[1].course_id).toBe('c-physics-lab');
      expect(res.slots[1].weight).toBe(2);
      expect(res.total_periods).toBe(3);
    });

    it('excludes classes on holidays (conducted = 0)', () => {
      const holidayEvent: CalendarEvent = {
        id: 'e-hol',
        user_id: 'u1',
        date: '2026-10-05',
        type: 'holiday',
        swap_target_weekday: null,
        note: 'State Holiday',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      };

      const res = resolveDaySchedule({
        date: '2026-10-05',
        versions,
        slots: baseSlots,
        calendarEvents: [holidayEvent],
      });

      expect(res.is_holiday).toBe(true);
      expect(res.holiday_note).toBe('State Holiday');
      expect(res.slots).toHaveLength(0);
      expect(res.total_periods).toBe(0);
    });

    it('handles range holidays (e.g. puja vacation)', () => {
      const rangeHoliday: CalendarEvent = {
        id: 'e-range',
        user_id: 'u1',
        date: '2026-10-04',
        end_date: '2026-10-10',
        type: 'holiday',
        swap_target_weekday: null,
        note: 'Dussehra Vacation',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      };

      // 2026-10-05 falls within range
      const res = resolveDaySchedule({
        date: '2026-10-05',
        versions,
        slots: baseSlots,
        calendarEvents: [rangeHoliday],
      });

      expect(res.is_holiday).toBe(true);
      expect(res.slots).toHaveLength(0);
    });

    it('handles swap days (e.g. Saturday follows Monday timetable)', () => {
      // 2026-10-10 is Saturday (weekday 6)
      const swapEvent: CalendarEvent = {
        id: 'e-swap',
        user_id: 'u1',
        date: '2026-10-10',
        type: 'swap_day',
        swap_target_weekday: 1, // Follow Monday schedule
        note: 'Compensatory Monday order',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      };

      const res = resolveDaySchedule({
        date: '2026-10-10',
        versions,
        slots: baseSlots,
        calendarEvents: [swapEvent],
      });

      expect(res.is_swap_day).toBe(true);
      expect(res.effective_weekday).toBe(1);
      expect(res.slots).toHaveLength(2);
      expect(res.slots[0].course_id).toBe('c-math');
    });

    it('applies one-off overrides: cancel, substitute, extra, and reschedule', () => {
      const overrides: TimetableOverride[] = [
        // 1. Cancel math class
        {
          id: 'ov-cancel',
          user_id: 'u1',
          term_id: 't1',
          date: '2026-10-05',
          action: 'cancel',
          original_slot_id: 'slot-mon-1',
          course_id: 'c-math',
          start_time: '09:00',
          end_time: '09:55',
          room: 'LH-1',
          faculty: null,
          component_type: 'theory',
          weight: 1,
          note: 'Prof away for conference',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        // 2. Substitute physics lab with Chemistry guest lecture
        {
          id: 'ov-sub',
          user_id: 'u1',
          term_id: 't1',
          date: '2026-10-05',
          action: 'substitute',
          original_slot_id: 'slot-mon-2',
          course_id: 'c-chemistry',
          start_time: '10:00',
          end_time: '11:55',
          room: 'Auditorium',
          faculty: 'Dr. Curium',
          component_type: 'theory',
          weight: 2,
          note: 'Guest Lecture',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
        // 3. Add extra tutorial in the afternoon
        {
          id: 'ov-extra',
          user_id: 'u1',
          term_id: 't1',
          date: '2026-10-05',
          action: 'extra',
          original_slot_id: null,
          course_id: 'c-cs',
          start_time: '14:00',
          end_time: '14:55',
          room: 'Lab 4',
          faculty: 'Prof. Turing',
          component_type: 'tutorial',
          weight: 1,
          note: 'Extra revision session',
          created_at: '',
          updated_at: '',
          deleted_at: null,
        },
      ];

      const res = resolveDaySchedule({
        date: '2026-10-05',
        versions,
        slots: baseSlots,
        calendarEvents: [],
        overrides,
      });

      // Math was cancelled, so not present
      expect(res.slots.find(s => s.course_id === 'c-math')).toBeUndefined();

      // Physics lab was substituted with chemistry
      const subSlot = res.slots.find(s => s.course_id === 'c-chemistry');
      expect(subSlot).toBeDefined();
      expect(subSlot?.is_override).toBe(true);
      expect(subSlot?.override_action).toBe('substitute');
      expect(subSlot?.room).toBe('Auditorium');

      // Extra CS class added
      const extraSlot = res.slots.find(s => s.course_id === 'c-cs');
      expect(extraSlot).toBeDefined();
      expect(extraSlot?.is_override).toBe(true);
      expect(extraSlot?.override_action).toBe('extra');
      expect(extraSlot?.start_time).toBe('14:00');

      // Total periods: chemistry (2) + extra cs (1) = 3
      expect(res.total_periods).toBe(3);
    });

    it('respects non-working days (e.g. Sunday with default working days)', () => {
      // 2026-10-04 is a Sunday (weekday 0)
      const res = resolveDaySchedule({
        date: '2026-10-04',
        versions,
        slots: baseSlots,
        calendarEvents: [],
        workingDays: [1, 2, 3, 4, 5, 6], // Sunday off
      });

      expect(res.is_working_day).toBe(false);
      expect(res.slots).toHaveLength(0);
    });

    it('handles edge case: change on the first or last day of a term', () => {
      const termFirstDay = '2026-08-01'; // Saturday
      const termLastDay = '2026-12-15'; // Tuesday

      const overrideFirstDay: TimetableOverride = {
        id: 'ov-first',
        user_id: 'u1',
        term_id: 't1',
        date: termFirstDay,
        action: 'extra',
        original_slot_id: null,
        course_id: 'c-math',
        start_time: '10:00',
        end_time: '11:00',
        room: 'Room 1',
        faculty: null,
        component_type: 'theory',
        weight: 1,
        note: 'Orientation Session',
        created_at: '',
        updated_at: '',
        deleted_at: null,
      };

      const resFirst = resolveDaySchedule({
        date: termFirstDay,
        versions,
        slots: baseSlots,
        calendarEvents: [],
        overrides: [overrideFirstDay],
      });

      expect(resFirst.slots).toHaveLength(1);
      expect(resFirst.slots[0].note).toBe('Orientation Session');

      const resLast = resolveDaySchedule({
        date: termLastDay,
        versions,
        slots: baseSlots,
        calendarEvents: [],
      });
      expect(resLast.date).toBe(termLastDay);
    });
  });
});
