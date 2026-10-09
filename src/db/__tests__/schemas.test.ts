import { describe, it, expect } from 'vitest';
import {
  profileSchema,
  programSchema,
  courseSchema,
  timetableSlotSchema,
  attendanceRecordSchema,
  validateEntity,
} from '../schemas';

describe('Zod Validation Schemas', () => {
  const validBase = {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    user_id: '00000000-0000-0000-0000-000000000001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };

  describe('profileSchema', () => {
    it('validates a valid profile', () => {
      const validProfile = {
        ...validBase,
        name: 'Aarav Sharma',
        region: 'IN' as const,
        theme: 'system' as const,
        accent: 'indigo',
        default_attendance_threshold: 75,
      };
      expect(() => validateEntity(profileSchema, validProfile)).not.toThrow();
    });

    it('rejects an invalid attendance threshold', () => {
      const invalidProfile = {
        ...validBase,
        name: 'Aarav',
        region: 'IN' as const,
        theme: 'light' as const,
        accent: 'indigo',
        default_attendance_threshold: 150, // exceeds 100
      };
      expect(() => validateEntity(profileSchema, invalidProfile)).toThrow();
    });
  });

  describe('programSchema', () => {
    it('validates a valid program', () => {
      const validProgram = {
        ...validBase,
        degree_type: 'BTech',
        branch_department: 'Computer Science and Engineering',
        start_year: 2024,
        duration_years: 4,
        entry_type: 'regular' as const,
        term_system: 'semester' as const,
        grading_scheme_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      };
      expect(() => validateEntity(programSchema, validProgram)).not.toThrow();
    });

    it('validates custom degree types and custom duration years', () => {
      const customProgram = {
        ...validBase,
        degree_type: 'B.Des (Interaction Design)',
        branch_department: 'Design & Media',
        start_year: 2023,
        duration_years: 5,
        entry_type: 'regular' as const,
        term_system: 'semester' as const,
        grading_scheme_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      };
      expect(() => validateEntity(programSchema, customProgram)).not.toThrow();
    });

    it('rejects invalid duration years (< 1 or > 10)', () => {
      const invalidLow = {
        ...validBase,
        degree_type: 'Custom Diploma',
        branch_department: 'General',
        start_year: 2024,
        duration_years: 0,
        entry_type: 'regular' as const,
        term_system: 'semester' as const,
        grading_scheme_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      };
      expect(() => validateEntity(programSchema, invalidLow)).toThrow();

      const invalidHigh = {
        ...validBase,
        degree_type: 'Lifelong Program',
        branch_department: 'General',
        start_year: 2024,
        duration_years: 11,
        entry_type: 'regular' as const,
        term_system: 'semester' as const,
        grading_scheme_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      };
      expect(() => validateEntity(programSchema, invalidHigh)).toThrow();
    });
  });

  describe('courseSchema', () => {
    it('validates a valid course', () => {
      const validCourse = {
        ...validBase,
        term_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        credits: 4,
        type: 'theory' as const,
        counts_toward_gpa: true,
        attendance_threshold_override: null,
        color: '#6366f1',
        medical_counts_as_present: false,
        duty_leave_counts_as_present: true,
      };
      expect(() => validateEntity(courseSchema, validCourse)).not.toThrow();
    });

    it('rejects a course with negative credits', () => {
      const invalidCourse = {
        ...validBase,
        term_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        name: 'Invalid Course',
        code: 'CS999',
        credits: -2,
        type: 'theory' as const,
        counts_toward_gpa: true,
        color: '#6366f1',
      };
      expect(() => validateEntity(courseSchema, invalidCourse)).toThrow();
    });

    it('validates a course with optional faculty name', () => {
      const validCourseWithFaculty = {
        ...validBase,
        term_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        name: 'Distributed Systems',
        code: 'CS401',
        credits: 4,
        type: 'theory' as const,
        counts_toward_gpa: true,
        attendance_threshold_override: null,
        color: '#6366f1',
        medical_counts_as_present: false,
        duty_leave_counts_as_present: true,
        faculty: 'Prof. E. W. Dijkstra',
      };
      expect(() => validateEntity(courseSchema, validCourseWithFaculty)).not.toThrow();
    });

    it('validates hybrid theory_and_lab course with custom attendance counting rule', () => {
      const validHybrid = {
        ...validBase,
        term_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        name: 'Database Management Systems',
        code: 'CS301',
        credits: 4,
        type: 'theory_and_lab' as const,
        counts_toward_gpa: true,
        lab_attendance_rule: 'single_session' as const,
        color: '#6366f1',
      };
      expect(() => validateEntity(courseSchema, validHybrid)).not.toThrow();
    });
  });

  describe('timetableSlotSchema', () => {
    it('validates weekday range (0 to 6)', () => {
      const validSlot = {
        ...validBase,
        course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        weekday: 1, // Monday
        start_time: '09:00',
        end_time: '09:55',
        room: 'Lab 2',
        component_type: 'lab' as const,
      };
      expect(() => validateEntity(timetableSlotSchema, validSlot)).not.toThrow();
    });

    it('rejects invalid weekday (e.g. 7 or negative)', () => {
      const invalidSlot = {
        ...validBase,
        course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        weekday: 7, // Not 0-6
        start_time: '09:00',
        end_time: '09:55',
      };
      expect(() => validateEntity(timetableSlotSchema, invalidSlot)).toThrow();
    });
  });

  describe('attendanceRecordSchema', () => {
    it('validates attendance statuses', () => {
      const validRecord = {
        ...validBase,
        course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        date: '2026-10-07',
        slot_id: null,
        status: 'present' as const,
        note: 'Attended morning lecture',
      };
      expect(() => validateEntity(attendanceRecordSchema, validRecord)).not.toThrow();
    });

    it('rejects unknown attendance status', () => {
      const invalidRecord = {
        ...validBase,
        course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
        date: '2026-10-07',
        status: 'bunked_without_excuse', // not a valid status
      };
      expect(() => validateEntity(attendanceRecordSchema, invalidRecord)).toThrow();
    });
  });
});
