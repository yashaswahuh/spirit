/**
 * Attendance Repository
 * Manages attendance logs and one-tap status updates.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { AttendanceRecord, AttendanceStatus, LabAttendanceRule } from '../../types';
import { attendanceRecordSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { recordDataChange } from '../../utils/storage';
import { getLabAttendanceRule } from '../../utils/preferences';
import { resolveSlotAttendanceWeight, timeToMinutes } from '../../engine/timetable';

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

export interface ClearAttendanceOptions {
  courseId?: string | null; // null or undefined means all courses
  startDate?: string | null;
  endDate?: string | null;
  resetOpeningBalances?: boolean;
}

/**
 * Counts how many attendance records match the given clear filters.
 */
export async function countAttendanceRecordsToClear(options: ClearAttendanceOptions = {}): Promise<number> {
  const { courseId, startDate, endDate } = options;

  let query = db.attendance_record.filter(r => r.deleted_at === null);

  if (courseId) {
    query = query.filter(r => r.course_id === courseId);
  }
  if (startDate) {
    query = query.filter(r => r.date >= startDate);
  }
  if (endDate) {
    query = query.filter(r => r.date <= endDate);
  }

  return query.count();
}

/**
 * Clears out ONLY logged attendance records without performing a total wipe.
 * Leaves courses, timetable slots, grading schemes, marks, tasks, and student profiles 100% intact.
 */
export async function clearAttendanceRecords(
  options: ClearAttendanceOptions = {}
): Promise<{ deletedCount: number; resetCoursesCount: number }> {
  const { courseId, startDate, endDate, resetOpeningBalances = false } = options;

  let query = db.attendance_record.filter(r => r.deleted_at === null);

  if (courseId) {
    query = query.filter(r => r.course_id === courseId);
  }
  if (startDate) {
    query = query.filter(r => r.date >= startDate);
  }
  if (endDate) {
    query = query.filter(r => r.date <= endDate);
  }

  const matchingRecords = await query.toArray();
  const recordIds = matchingRecords.map(r => r.id);
  let resetCoursesCount = 0;

  await db.transaction('rw', [db.attendance_record, db.course], async () => {
    if (recordIds.length > 0) {
      await db.attendance_record.bulkDelete(recordIds);
    }

    if (resetOpeningBalances) {
      let coursesQuery = db.course.filter(c => c.deleted_at === null);
      if (courseId) {
        coursesQuery = coursesQuery.filter(c => c.id === courseId);
      }
      const targetCourses = await coursesQuery.toArray();
      resetCoursesCount = targetCourses.length;
      const now = new Date().toISOString();
      for (const course of targetCourses) {
        await db.course.update(course.id, {
          initial_attended: 0,
          initial_conducted: 0,
          tracking_start_date: null,
          updated_at: now,
        });
      }
    }
  });

  recordDataChange();
  return { deletedCount: recordIds.length, resetCoursesCount };
}

/**
 * Synchronizes attendance record weights for a course based on its effective attendance counting rule.
 * Ensures instant updates across all historical logs when a user toggles between 1pt and 2pts per session.
 */
export async function syncCourseAttendanceWeights(
  courseId: string,
  courseRule?: LabAttendanceRule | null,
  globalRule?: LabAttendanceRule
): Promise<number> {
  const course = await db.course.get(courseId);
  if (!course) return 0;

  const effectiveGlobal = globalRule || getLabAttendanceRule();
  const effectiveRule =
    courseRule !== undefined
      ? (courseRule || effectiveGlobal)
      : (course.lab_attendance_rule || effectiveGlobal);

  const slots = await db.timetable_slot
    .where('course_id')
    .equals(courseId)
    .filter(s => s.deleted_at === null)
    .toArray();

  const slotsMap = new Map(slots.map(s => [s.id, s]));

  // Canonical lab weight for this course: max of slot durations or 2 if lab course
  const maxSlotWeight = slots.reduce((max, s) => {
    const diff = (s.start_time && s.end_time)
      ? timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
      : 0;
    const calcWeight = diff >= 150 ? 3 : diff >= 90 ? 2 : (s.weight || 1);
    return Math.max(max, calcWeight);
  }, 1);

  const canonicalLabWeight =
    maxSlotWeight > 1 ? maxSlotWeight : (course.type === 'lab' ? 2 : 1);

  const records = await db.attendance_record
    .where('course_id')
    .equals(courseId)
    .filter(r => r.deleted_at === null)
    .toArray();

  const updates: Array<{ id: string; weight: number }> = [];

  for (const record of records) {
    const slot = record.slot_id ? slotsMap.get(record.slot_id) : undefined;
    const diffMins = (slot?.start_time && slot?.end_time)
      ? timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)
      : 0;

    const isTheoryLecture = record.component_type === 'theory' && course.type === 'theory_and_lab';
    const isLab = !isTheoryLecture && (
      record.component_type === 'lab' ||
      course.type === 'lab' ||
      diffMins >= 90 ||
      (slot && slot.weight !== undefined && slot.weight > 1) ||
      (slot && slot.attendance_weight !== undefined && slot.attendance_weight !== null && slot.attendance_weight > 1) ||
      (course.lab_attendance_rule !== null && canonicalLabWeight > 1) ||
      (record.weight !== undefined && record.weight > 1)
    );

    if (isLab) {
      const slotWeight = slot
        ? resolveSlotAttendanceWeight(slot, course, effectiveGlobal)
        : canonicalLabWeight;
      const targetWeight =
        effectiveRule === 'single_session' ? 1 : Math.max(2, slotWeight);

      if (record.weight !== targetWeight) {
        updates.push({ id: record.id, weight: targetWeight });
      }
    }
  }

  if (updates.length > 0) {
    const now = new Date().toISOString();
    await db.transaction('rw', db.attendance_record, async () => {
      for (const u of updates) {
        await db.attendance_record.update(u.id, {
          weight: u.weight,
          updated_at: now,
        });
      }
    });
    recordDataChange();
  }

  return updates.length;
}

/**
 * Synchronizes attendance weights across all courses to normalize historical records.
 */
export async function syncAllCoursesAttendanceWeights(newGlobalRule?: LabAttendanceRule): Promise<number> {
  const globalRule = newGlobalRule || getLabAttendanceRule();
  const courses = await db.course.filter(c => c.deleted_at === null).toArray();
  let totalUpdated = 0;

  for (const course of courses) {
    // Sync all courses so historical inconsistent logs are immediately reconciled
    const updated = await syncCourseAttendanceWeights(course.id, course.lab_attendance_rule, globalRule);
    totalUpdated += updated;
  }

  return totalUpdated;
}
