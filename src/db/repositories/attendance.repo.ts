/**
 * Attendance Repository
 * Manages attendance logs and one-tap status updates.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { AttendanceRecord, AttendanceStatus, LabAttendanceRule, Term } from '../../types';
import { attendanceRecordSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { recordDataChange } from '../../utils/storage';
import { getLabAttendanceRule } from '../../utils/preferences';
import { resolveSlotAttendanceWeight, timeToMinutes } from '../../engine/timetable';
import { shouldDeactivateSaturdayRecord, shouldRestoreSaturdayRecord } from '../../engine/attendance';

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
  createNew?: boolean;
}

/**
 * One-tap attendance mark or toggle.
 * If an attendance record already exists for (course_id, date, slot_id), updates its status.
 * Otherwise creates a new record.
 * If createNew is true, always creates a new session record.
 */
export async function markAttendance(params: MarkAttendanceParams): Promise<AttendanceRecord> {
  const now = new Date().toISOString();
  const { course_id, date, status, slot_id = null, note = null, weight = 1, component_type, createNew = false } = params;

  let existing: AttendanceRecord | undefined;

  if (!createNew) {
    // Query existing active records for this course and date
    const records = await db.attendance_record
      .where('course_id')
      .equals(course_id)
      .filter(r => r.deleted_at === null && r.date === date)
      .toArray();

    // Find matching record: exact slot_id match first, or match by component_type, or adopt existing record
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

    const isMultiPeriodOrLab =
      record.component_type === 'lab' ||
      course.type === 'lab' ||
      diffMins >= 90 ||
      (slot && slot.weight !== undefined && slot.weight > 1) ||
      (slot && slot.attendance_weight !== undefined && slot.attendance_weight !== null && slot.attendance_weight > 1) ||
      canonicalLabWeight > 1 ||
      (record.weight !== undefined && record.weight > 1);

    if (isMultiPeriodOrLab) {
      let targetWeight: number;
      if (effectiveRule === 'single_session') {
        targetWeight = 1;
      } else {
        if (slot) {
          if (slot.component_type !== 'lab' && (!slot.weight || slot.weight <= 1) && diffMins < 90) {
            targetWeight = 1;
          } else {
            const slotWeight = resolveSlotAttendanceWeight(slot, course, effectiveGlobal);
            targetWeight = Math.max(slotWeight, 2);
          }
        } else {
          targetWeight = (record.component_type === 'theory' && course.type === 'theory_and_lab')
            ? 1
            : Math.max(canonicalLabWeight, 2);
        }
      }

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

export interface SaturdayReconciliationResult {
  deactivated: number;
  restored: number;
}

/**
 * Automatically adjusts attendance records when a semester's Saturday working rule changes
 * (e.g. from 'second_saturday_off' to 'second_fourth_saturday_off' or 'all_saturdays_off').
 *
 * - When a Saturday becomes OFF: Any active attendance records logged on that Saturday
 *   (and not overridden by a swap day event) are soft-deleted and tagged with `[auto_saturday_off]`,
 *   so they immediately stop inflating or penalizing the student's attendance stats.
 * - When a Saturday becomes WORKING again: Any previously auto-deactivated records tagged with
 *   `[auto_saturday_off]` on that Saturday are safely restored without data loss.
 */
export async function reconcileSaturdayAttendanceRecords(termId?: string): Promise<SaturdayReconciliationResult> {
  let term: Term | undefined;
  if (termId) {
    term = await db.term.get(termId);
  } else {
    term = await db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first();
    if (!term) {
      term = await db.term.filter(t => t.deleted_at === null).first();
    }
  }

  if (!term || term.deleted_at) {
    return { deactivated: 0, restored: 0 };
  }

  const saturdayRule = term.saturday_rule || 'second_saturday_off';

  // Find courses belonging to this term
  const termCourses = await db.course
    .where('term_id')
    .equals(term.id)
    .filter(c => c.deleted_at === null)
    .toArray();

  if (termCourses.length === 0) {
    return { deactivated: 0, restored: 0 };
  }
  const courseIds = new Set(termCourses.map(c => c.id));

  // Find swap day calendar events (swap days turn an off-Saturday into a working day)
  const swapEvents = await db.calendar_event
    .filter(e => e.deleted_at === null && e.type === 'swap_day')
    .toArray();
  const swapDates = new Set(swapEvents.map(e => e.date));

  // Fetch all attendance records for these courses
  const allRecords = await db.attendance_record
    .filter(r => courseIds.has(r.course_id))
    .toArray();

  const now = new Date().toISOString();
  let deactivatedCount = 0;
  let restoredCount = 0;

  const toUpdate: Array<{ id: string; deleted_at: string | null; note: string | null }> = [];

  for (const record of allRecords) {
    // Only process records within the semester bounds if set
    if (term.start_date && record.date < term.start_date) continue;
    if (term.end_date && record.date > term.end_date) continue;

    if (shouldDeactivateSaturdayRecord(record, saturdayRule, swapDates)) {
      const noteTag = '[auto_saturday_off]';
      const newNote = record.note
        ? (record.note.includes(noteTag) ? record.note : `${record.note} ${noteTag}`)
        : noteTag;

      toUpdate.push({
        id: record.id,
        deleted_at: now,
        note: newNote,
      });
      deactivatedCount++;
    } else if (shouldRestoreSaturdayRecord(record, saturdayRule, swapDates)) {
      const cleanNote = record.note ? record.note.replace('[auto_saturday_off]', '').trim() || null : null;
      toUpdate.push({
        id: record.id,
        deleted_at: null,
        note: cleanNote,
      });
      restoredCount++;
    }
  }

  if (toUpdate.length > 0) {
    await db.transaction('rw', db.attendance_record, async () => {
      for (const item of toUpdate) {
        await db.attendance_record.update(item.id, {
          deleted_at: item.deleted_at,
          note: item.note,
          updated_at: now,
        });
      }
    });
    recordDataChange();
  }

  return { deactivated: deactivatedCount, restored: restoredCount };
}

