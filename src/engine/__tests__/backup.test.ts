import { describe, it, expect } from 'vitest';
import {
  escapeCsvCell,
  shouldIncomingEntityWin,
  parseAndValidateBackup,
  BACKUP_SCHEMA_VERSION,
  BACKUP_APP_ID,
} from '../../utils/backup';
import type { BackupPayload } from '../../db/schemas';

describe('Backup and Restore Engine', () => {
  describe('escapeCsvCell', () => {
    it('returns empty string for null and undefined', () => {
      expect(escapeCsvCell(null)).toBe('');
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('returns raw string for safe text without commas or quotes', () => {
      expect(escapeCsvCell('CS501')).toBe('CS501');
      expect(escapeCsvCell(85)).toBe('85');
    });

    it('wraps text with quotes if it contains a comma', () => {
      expect(escapeCsvCell('Data Structures, Algorithms')).toBe('"Data Structures, Algorithms"');
    });

    it('doubles internal double quotes and wraps in quotes', () => {
      expect(escapeCsvCell('Section "A" Lab')).toBe('"Section ""A"" Lab"');
    });

    it('wraps text containing newlines in quotes', () => {
      expect(escapeCsvCell("Line 1\nLine 2")).toBe("\"Line 1\nLine 2\"");
    });
  });

  describe('shouldIncomingEntityWin (Merge Conflict Resolution)', () => {
    const baseId = '11111111-1111-1111-1111-111111111111';

    it('incoming wins when no local entity exists', () => {
      const incoming = { id: baseId, updated_at: '2026-10-01T10:00:00.000Z' };
      expect(shouldIncomingEntityWin(null, incoming)).toBe(true);
      expect(shouldIncomingEntityWin(undefined, incoming)).toBe(true);
    });

    it('incoming wins when incoming updated_at is newer than local updated_at', () => {
      const existing = { id: baseId, updated_at: '2026-10-01T10:00:00.000Z' };
      const incoming = { id: baseId, updated_at: '2026-10-02T12:00:00.000Z' };
      expect(shouldIncomingEntityWin(existing, incoming)).toBe(true);
    });

    it('local wins (incoming loses) when incoming updated_at is older than local updated_at', () => {
      const existing = { id: baseId, updated_at: '2026-10-05T15:00:00.000Z' };
      const incoming = { id: baseId, updated_at: '2026-10-01T10:00:00.000Z' };
      expect(shouldIncomingEntityWin(existing, incoming)).toBe(false);
    });

    it('incoming wins when timestamps are identical', () => {
      const timestamp = '2026-10-03T09:00:00.000Z';
      const existing = { id: baseId, updated_at: timestamp };
      const incoming = { id: baseId, updated_at: timestamp };
      expect(shouldIncomingEntityWin(existing, incoming)).toBe(true);
    });

    it('handles invalid date strings gracefully', () => {
      const existing = { id: baseId, updated_at: 'invalid-date' };
      const incoming = { id: baseId, updated_at: '2026-10-01T10:00:00.000Z' };
      expect(shouldIncomingEntityWin(existing, incoming)).toBe(true);

      const invalidIncoming = { id: baseId, updated_at: 'invalid-date' };
      const validExisting = { id: baseId, updated_at: '2026-10-01T10:00:00.000Z' };
      expect(shouldIncomingEntityWin(validExisting, invalidIncoming)).toBe(false);
    });
  });

  describe('parseAndValidateBackup', () => {
    const validMinimalPayload: BackupPayload = {
      app: BACKUP_APP_ID,
      version: BACKUP_SCHEMA_VERSION,
      exported_at: '2026-10-07T10:00:00.000Z',
      data: {
        profile: [
          {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            user_id: '00000000-0000-0000-0000-000000000001',
            name: 'Aarav Sharma',
            region: 'IN',
            theme: 'system',
            accent: 'indigo',
            default_attendance_threshold: 75,
            created_at: '2026-10-01T10:00:00.000Z',
            updated_at: '2026-10-01T10:00:00.000Z',
            deleted_at: null,
          },
        ],
        program: [],
        grading_scheme: [],
        term: [],
        course: [
          {
            id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
            user_id: '00000000-0000-0000-0000-000000000001',
            term_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
            name: 'Operating Systems',
            code: 'CS501',
            credits: 4,
            type: 'theory',
            counts_toward_gpa: true,
            color: '#6366f1',
            medical_counts_as_present: false,
            duty_leave_counts_as_present: true,
            created_at: '2026-10-01T10:00:00.000Z',
            updated_at: '2026-10-01T10:00:00.000Z',
            deleted_at: null,
          },
        ],
        timetable_version: [],
        timetable_slot: [],
        timetable_override: [],
        calendar_event: [],
        attendance_record: [
          {
            id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
            user_id: '00000000-0000-0000-0000-000000000001',
            course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
            date: '2026-10-02',
            status: 'present',
            weight: 1,
            slot_id: null,
            override_id: null,
            note: 'Attended',
            created_at: '2026-10-02T10:00:00.000Z',
            updated_at: '2026-10-02T10:00:00.000Z',
            deleted_at: null,
          },
        ],
        assessment_component: [],
        mark: [],
        grade_result: [],
        task: [
          {
            id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
            user_id: '00000000-0000-0000-0000-000000000001',
            title: 'Complete Lab 3',
            type: 'assignment',
            due_at: '2026-10-15',
            course_id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
            done: false,
            created_at: '2026-10-02T10:00:00.000Z',
            updated_at: '2026-10-02T10:00:00.000Z',
            deleted_at: null,
          },
        ],
      },
    };

    it('validates a valid backup payload and calculates accurate entity counts', () => {
      const json = JSON.stringify(validMinimalPayload);
      const res = parseAndValidateBackup(json);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.counts.profiles).toBe(1);
        expect(res.counts.courses).toBe(1);
        expect(res.counts.attendanceRecords).toBe(1);
        expect(res.counts.tasks).toBe(1);
        expect(res.counts.totalRecords).toBe(4);
      }
    });

    it('rejects malformed non-JSON input', () => {
      const res = parseAndValidateBackup('invalid { json string');
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('Malformed backup file');
      }
    });

    it('rejects backup with invalid or foreign app identifier', () => {
      const invalid = { ...validMinimalPayload, app: 'foreign_app' };
      const res = parseAndValidateBackup(JSON.stringify(invalid));
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('Not a Spirit backup');
      }
    });

    it('rejects backup created by a newer schema version', () => {
      const newerVersion = { ...validMinimalPayload, version: 99 };
      const res = parseAndValidateBackup(JSON.stringify(newerVersion));
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('newer version of Spirit (version 99)');
      }
    });

    it('rejects backup with corrupted entity schema (e.g. invalid status)', () => {
      const corrupted = JSON.parse(JSON.stringify(validMinimalPayload));
      corrupted.data.attendance_record[0].status = 'unknown_invalid_status';
      const res = parseAndValidateBackup(JSON.stringify(corrupted));
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error).toContain('Backup validation failed');
        expect(res.details?.length).toBeGreaterThan(0);
      }
    });
  });
});
