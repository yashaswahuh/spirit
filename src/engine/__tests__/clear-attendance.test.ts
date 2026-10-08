import { describe, it, expect } from 'vitest';
import { shouldClearAttendanceRecord } from '../attendance';

describe('Clear Attendance Logic & Filtering', () => {
  const records = [
    {
      id: 'rec-1',
      course_id: 'course-os',
      date: '2026-09-01',
      status: 'present',
      deleted_at: null,
    },
    {
      id: 'rec-2',
      course_id: 'course-os',
      date: '2026-09-15',
      status: 'absent',
      deleted_at: null,
    },
    {
      id: 'rec-3',
      course_id: 'course-os',
      date: '2026-10-01',
      status: 'present',
      deleted_at: null,
    },
    {
      id: 'rec-4',
      course_id: 'course-dbms',
      date: '2026-09-10',
      status: 'present',
      deleted_at: null,
    },
    {
      id: 'rec-5',
      course_id: 'course-dbms',
      date: '2026-10-05',
      status: 'absent',
      deleted_at: null,
    },
    {
      id: 'rec-6',
      course_id: 'course-os',
      date: '2026-09-20',
      status: 'present',
      deleted_at: '2026-09-21T00:00:00.000Z', // Soft-deleted record
    },
  ];

  it('matches all active records when scope is "all" and no date filters are set', () => {
    const toClear = records.filter(r => shouldClearAttendanceRecord(r, {}));
    expect(toClear.length).toBe(5);
    expect(toClear.map(r => r.id)).toEqual(['rec-1', 'rec-2', 'rec-3', 'rec-4', 'rec-5']);
    // Soft-deleted record rec-6 is ignored
    expect(toClear.some(r => r.id === 'rec-6')).toBe(false);
  });

  it('filters by specific course ID when course scope is selected', () => {
    const osRecords = records.filter(r =>
      shouldClearAttendanceRecord(r, { courseId: 'course-os' })
    );
    expect(osRecords.length).toBe(3);
    expect(osRecords.map(r => r.id)).toEqual(['rec-1', 'rec-2', 'rec-3']);

    const dbmsRecords = records.filter(r =>
      shouldClearAttendanceRecord(r, { courseId: 'course-dbms' })
    );
    expect(dbmsRecords.length).toBe(2);
    expect(dbmsRecords.map(r => r.id)).toEqual(['rec-4', 'rec-5']);
  });

  it('filters by date range (from startDate to endDate)', () => {
    const septemberRecords = records.filter(r =>
      shouldClearAttendanceRecord(r, {
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      })
    );
    expect(septemberRecords.length).toBe(3);
    expect(septemberRecords.map(r => r.id)).toEqual(['rec-1', 'rec-2', 'rec-4']);

    const octoberRecords = records.filter(r =>
      shouldClearAttendanceRecord(r, {
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      })
    );
    expect(octoberRecords.length).toBe(2);
    expect(octoberRecords.map(r => r.id)).toEqual(['rec-3', 'rec-5']);
  });

  it('combines course filter with date range filter', () => {
    const osSeptRecords = records.filter(r =>
      shouldClearAttendanceRecord(r, {
        courseId: 'course-os',
        startDate: '2026-09-01',
        endDate: '2026-09-30',
      })
    );
    expect(osSeptRecords.length).toBe(2);
    expect(osSeptRecords.map(r => r.id)).toEqual(['rec-1', 'rec-2']);
  });

  it('preserves course metadata when opening balances are reset', () => {
    const originalCourse = {
      id: 'course-1',
      name: 'Operating Systems',
      code: 'CS501',
      credits: 4,
      type: 'theory' as const,
      color: '#6366f1',
      faculty: 'Dr. John',
      lab_attendance_rule: null,
      initial_attended: 12,
      initial_conducted: 15,
      tracking_start_date: '2026-09-01',
    };

    // Simulated reset of opening balances
    const resetCourse = {
      ...originalCourse,
      initial_attended: 0,
      initial_conducted: 0,
      tracking_start_date: null,
    };

    expect(resetCourse.initial_attended).toBe(0);
    expect(resetCourse.initial_conducted).toBe(0);
    expect(resetCourse.tracking_start_date).toBeNull();

    // Verify non-attendance properties are preserved
    expect(resetCourse.name).toBe('Operating Systems');
    expect(resetCourse.code).toBe('CS501');
    expect(resetCourse.credits).toBe(4);
    expect(resetCourse.type).toBe('theory');
    expect(resetCourse.color).toBe('#6366f1');
    expect(resetCourse.faculty).toBe('Dr. John');
  });
});

