/**
 * Attendance Repository
 * Manages attendance logs and one-tap status updates.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { AttendanceRecord, AttendanceStatus } from '../../types';
import { attendanceRecordSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { recordDataChange } from '../../utils/storage';

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
  weight?: number;
  component_type?: any;
}

/**
 * One-tap attendance mark or toggle.
 * If an attendance record already exists for (course_id, date, slot_id), updates its status.
 * Otherwise creates a new record.
 */
export async function markAttendance(params: MarkAttendanceParams): Promise<AttendanceRecord> {
  const now = new Date().toISOString();
  const { course_id, date, status, slot_id = null, note = null, weight = 1, component_type } = params;

  // Query existing active records for this course and date
  const records = await db.attendance_record
    .where('course_id')
    .equals(course_id)
    .filter(r => r.deleted_at === null && r.date === date)
    .toArray();

  // Find matching record: exact slot_id match first, or match by component_type, or adopt existing record
  let existing: AttendanceRecord | undefined;
  if (slot_id) {
    existing = records.find(r => r.slot_id === slot_id);
    if (!existing) {
      existing = records.find(r => !r.slot_id && (!component_type || r.component_type === component_type));
    }
  } else if (component_type) {
    // If component_type is specified (e.g. theory or lab), match that component's record
    existing = records.find(r => r.component_type === component_type);
  } else {
    existing = records[0];
  }

  if (existing) {
    const updated: AttendanceRecord = {
      ...existing,
      status,
      slot_id: slot_id ?? existing.slot_id,
      note: note !== undefined ? note : existing.note,
      weight: weight !== undefined ? weight : existing.weight,
      component_type: component_type !== undefined ? (component_type || null) : existing.component_type,
      updated_at: now,
    };
    validateEntity(attendanceRecordSchema, updated);
    await db.attendance_record.put(updated);
    recordDataChange();
    return updated;
  }

  const newRecord: AttendanceRecord = {
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    course_id,
    date,
    slot_id,
    status,
    weight,
    component_type: component_type || null,
    note,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(attendanceRecordSchema, newRecord);
  await db.attendance_record.put(newRecord);
  recordDataChange();
  return newRecord;
}

export async function deleteAttendanceRecord(id: string): Promise<void> {
  const existing = await db.attendance_record.get(id);
  if (existing) {
    await db.attendance_record.update(id, {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    recordDataChange();
  }
}
