import { describe, it, expect } from 'vitest';
import { generateTimetableIcs, generateTasksIcs } from '../ics';
import type { Course, TimetableSlot, Term, Task } from '../../types';

describe('iCalendar generator', () => {
  const dummyTerm: Term = {
    id: 't-1',
    user_id: 'u-1',
    program_id: 'p-1',
    name: 'Odd Sem 2026',
    number: 3,
    sgpa: null,
    start_date: '2026-08-01',
    end_date: '2026-12-15',
    working_days: [1, 2, 3, 4, 5],
    status: 'ongoing',
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-01T00:00:00Z',
    deleted_at: null,
  };

  const dummyCourses: Course[] = [
    {
      id: 'c-1',
      user_id: 'u-1',
      term_id: 't-1',
      name: 'Computer Networks',
      code: 'CS301',
      credits: 4,
      type: 'theory',
      counts_toward_gpa: true,
      attendance_threshold_override: null,
      color: '#6366f1',
      medical_counts_as_present: false,
      duty_leave_counts_as_present: true,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    },
  ];

  it('generates valid timetable .ics with RRULE and VALARM', () => {
    const slots: TimetableSlot[] = [
      {
        id: 'slot-1',
        user_id: 'u-1',
        course_id: 'c-1',
        weekday: 1, // Monday
        start_time: '09:00',
        end_time: '09:55',
        room: 'LT-2',
        faculty: 'Prof. Roy',
        component_type: 'theory',
        weight: 1,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        deleted_at: null,
      },
    ];

    const ics = generateTimetableIcs({
      term: dummyTerm,
      slots,
      courses: dummyCourses,
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Computer Networks (CS301)');
    expect(ics).toContain('LOCATION:LT-2');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;UNTIL=20261215T235959Z;BYDAY=MO');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:-PT15M');
    expect(ics).toContain('END:VALARM');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('generates valid tasks & exams .ics with alarms', () => {
    const tasks: Task[] = [
      {
        id: 'task-1',
        user_id: 'u-1',
        course_id: 'c-1',
        title: 'Mid-Sem Examination',
        type: 'exam',
        due_at: '2026-10-15T10:00:00',
        venue: 'Exam Hall 3',
        done: false,
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        deleted_at: null,
      },
    ];

    const ics = generateTasksIcs({
      tasks,
      courses: dummyCourses,
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:[Computer Networks] Mid-Sem Examination');
    expect(ics).toContain('LOCATION:Exam Hall 3');
    expect(ics).toContain('DTSTART:20261015T100000');
    expect(ics).toContain('TRIGGER:-P1D'); // 1 day before
    expect(ics).toContain('TRIGGER:-PT2H'); // 2 hours before
    expect(ics).toContain('END:VCALENDAR');
  });

  it('accurately incorporates second Saturday off and holiday exclusions using EXDATE', () => {
    const termWithSatRule: Term = {
      ...dummyTerm,
      start_date: '2026-08-01', // Saturday (1st Saturday, working)
      end_date: '2026-08-31',
      saturday_rule: 'second_saturday_off',
    };

    const satSlot: TimetableSlot = {
      id: 'slot-sat',
      user_id: 'u-1',
      course_id: 'c-1',
      weekday: 6, // Saturday
      start_time: '10:00',
      end_time: '11:00',
      room: 'Lab-1',
      faculty: null,
      component_type: 'lab',
      weight: 1,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };

    // Holiday on 3rd Saturday 2026-08-15 (Independence Day)
    const holidays = [
      {
        id: 'hol-1',
        user_id: 'u-1',
        date: '2026-08-15',
        type: 'holiday' as const,
        swap_target_weekday: null,
        note: 'Independence Day',
        created_at: '2026-08-01T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
        deleted_at: null,
      },
    ];

    const ics = generateTimetableIcs({
      term: termWithSatRule,
      slots: [satSlot],
      courses: dummyCourses,
      calendarEvents: holidays,
    });

    // DTSTART should be 1st Saturday (2026-08-01)
    expect(ics).toContain('DTSTART:20260801T100000');
    // 2nd Saturday (2026-08-08) is off via saturday_rule -> EXDATE
    expect(ics).toContain('EXDATE:20260808T100000');
    // 3rd Saturday (2026-08-15) is a holiday -> EXDATE
    expect(ics).toContain('EXDATE:20260815T100000');
  });

  it('correctly sets DTSTART to first working day when term begins on an off-Saturday', () => {
    const termStartingOnOffSat: Term = {
      ...dummyTerm,
      start_date: '2026-08-08', // 2nd Saturday (off)
      end_date: '2026-08-31',
      saturday_rule: 'second_saturday_off',
    };

    const satSlot: TimetableSlot = {
      id: 'slot-sat-2',
      user_id: 'u-1',
      course_id: 'c-1',
      weekday: 6,
      start_time: '14:00',
      end_time: '15:00',
      room: 'CR-101',
      faculty: null,
      component_type: 'theory',
      weight: 1,
      created_at: '2026-08-01T00:00:00Z',
      updated_at: '2026-08-01T00:00:00Z',
      deleted_at: null,
    };

    const ics = generateTimetableIcs({
      term: termStartingOnOffSat,
      slots: [satSlot],
      courses: dummyCourses,
    });

    // Since 2026-08-08 is off, DTSTART should start on 3rd Saturday (2026-08-15)
    expect(ics).toContain('DTSTART:20260815T140000');
  });
});

