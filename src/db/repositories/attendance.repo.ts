/**
 * Attendance Repository
 * Manages attendance logs and one-tap status updates.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { attendanceRecordSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';

export async function getAttendanceRecordsForCourse(courseId: string): Promise<AttendanceRecord[]> {
  return db.attendance_record
    .where('course_id')
    .equals(courseId)
    .filter(r => r.deleted_at === null)
    .toArray();
}

export async function getAttendanceRecordsForDate(dateStr: string): Promise<AttendanceRecord[]> {
  return db.attendance_record
    .where('date')
    .equals(dateStr)
    .filter(r => r.deleted_at === null)
    .toArray();
}

export interface MarkAttendanceParams {
  course_id: string;
  date: string; // YYYY-MM-DD
  status: AttendanceStatus;
  slot_id?: string | null;
  note?: string | null;
}

/**
 * One-tap attendance mark or toggle.
 * If an attendance record already exists for (course_id, date, slot_id), updates its status.
 * Otherwise creates a new record.
 */
export async function markAttendance(params: MarkAttendanceParams): Promise<AttendanceRecord> {
  const now = new Date().toISOString();
  const { course_id, date, status, slot_id = null, note = null } = params;

  // Query existing active records for this course and date
  const records = await db.attendance_record
    .where('course_id')
    .equals(course_id)
    .filter(r => r.deleted_at === null && r.date === date && (slot_id ? r.slot_id === slot_id : true))
    .toArray();

  if (records.length > 0) {
    const existing = records[0];
    const updated: AttendanceRecord = {
      ...existing,
      status,
      note: note ?? existing.note,
      updated_at: now,
    };
    validateEntity(attendanceRecordSchema, updated);
    await db.attendance_record.put(updated);
    return updated;
  }

  const newRecord: AttendanceRecord = {
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    course_id,
    date,
    slot_id,
    status,
    note,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(attendanceRecordSchema, newRecord);
  await db.attendance_record.put(newRecord);
  return newRecord;
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const existing = await db.attendance_record.get(id);
  if (existing) {
    await db.attendance_record.update(id, {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}
