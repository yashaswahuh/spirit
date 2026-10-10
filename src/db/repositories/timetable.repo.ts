/**
 * Timetable Repository
 * Handles class schedules, timetable versions, one-off overrides, and resolves daily schedules.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import {
  TimetableSlot,
  TimetableVersion,
  TimetableOverride,
  Weekday,
} from '../../types';
import {
  timetableSlotSchema,
  timetableVersionSchema,
  timetableOverrideSchema,
  validateEntity,
} from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { resolveDaySchedule, DayScheduleResolution } from '../../engine/timetable';
import { updateCourseFaculty } from './course.repo';
import { getLabAttendanceRule } from '../../utils/preferences';

// ============================================================================
// TIMETABLE SLOTS
// ============================================================================

export async function getTimetableSlots(versionId?: string | null): Promise<TimetableSlot[]> {
  const all = await db.timetable_slot.filter(s => s.deleted_at === null).toArray();
  if (versionId !== undefined) {
    return all.filter(s => s.version_id === versionId);
  }
  return all;
}

export async function getTimetableSlotsForWeekday(
  weekday: Weekday,
  versionId?: string | null
): Promise<TimetableSlot[]> {
  const all = await db.timetable_slot
    .where('weekday')
    .equals(weekday)
    .filter(s => s.deleted_at === null)
    .toArray();

  if (versionId !== undefined) {
    return all.filter(s => s.version_id === versionId);
  }
  return all;
}

export async function createTimetableSlot(
  data: Omit<TimetableSlot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<TimetableSlot> {
  const now = new Date().toISOString();
  let slotFaculty = data.faculty !== undefined ? (data.faculty?.trim() || null) : null;
  if (!slotFaculty && data.course_id) {
    const course = await db.course.get(data.course_id);
    if (course && !course.deleted_at && course.faculty) {
      slotFaculty = course.faculty;
    }
  }

  const newSlot: TimetableSlot = {
    ...data,
    faculty: slotFaculty,
    weight: data.weight && data.weight > 0 ? data.weight : 1,
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(timetableSlotSchema, newSlot);
  await db.timetable_slot.put(newSlot);

  // Synchronize professor/faculty name with the course and all its slots if explicitly provided
  if (data.faculty !== undefined && newSlot.course_id) {
    await updateCourseFaculty(newSlot.course_id, newSlot.faculty);
  }

  return newSlot;
}

export async function updateTimetableSlot(
  id: string,
  data: Partial<Omit<TimetableSlot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>>
): Promise<TimetableSlot> {
  const now = new Date().toISOString();
  const existing = await db.timetable_slot.get(id);
  if (!existing || existing.deleted_at) {
    throw new Error(`Timetable slot ${id} not found`);
  }

  const updated: TimetableSlot = {
    ...existing,
    ...data,
    faculty: data.faculty !== undefined ? (data.faculty?.trim() || null) : existing.faculty,
    weight: data.weight !== undefined ? data.weight : (existing.weight || 1),
    updated_at: now,
  };

  validateEntity(timetableSlotSchema, updated);
  await db.timetable_slot.put(updated);

  // Synchronize professor/faculty name with the course and all its slots
  if (data.faculty !== undefined && updated.course_id) {
    await updateCourseFaculty(updated.course_id, data.faculty);
  }

  return updated;
}

export async function duplicateTimetableSlot(
  id: string,
  targetWeekday?: Weekday
): Promise<TimetableSlot> {
  const existing = await db.timetable_slot.get(id);
  if (!existing || existing.deleted_at) {
    throw new Error(`Timetable slot ${id} not found`);
  }

  const { id: _, created_at: __, updated_at: ___, deleted_at: ____, ...rest } = existing;
  return createTimetableSlot({
    ...rest,
    weekday: targetWeekday !== undefined ? targetWeekday : existing.weekday,
  });
}

export async function deleteTimetableSlot(id: string): Promise<void> {
  await db.timetable_slot.update(id, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ============================================================================
// TIMETABLE VERSIONS
// ============================================================================

export async function getTimetableVersions(termId?: string): Promise<TimetableVersion[]> {
  const all = await db.timetable_version.filter(v => v.deleted_at === null).toArray();
  if (termId) {
    return all.filter(v => v.term_id === termId).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
  }
  return all.sort((a, b) => b.effective_from.localeCompare(a.effective_from));
}

export async function createTimetableVersion(
  termId: string,
  name: string,
  effectiveFrom: string
): Promise<TimetableVersion> {
  const now = new Date().toISOString();
  const newVersion: TimetableVersion = {
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    term_id: termId,
    name,
    effective_from: effectiveFrom,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(timetableVersionSchema, newVersion);
  await db.timetable_version.put(newVersion);
  return newVersion;
}

/**
 * Creates a new timetable version and copies all active slots from source version to the new version.
 */
export async function duplicateTimetableVersionWithSlots(
  sourceVersionId: string | null,
  termId: string,
  name: string,
  effectiveFrom: string
): Promise<TimetableVersion> {
  const newVersion = await createTimetableVersion(termId, name, effectiveFrom);

  // Fetch slots to copy
  let sourceSlots: TimetableSlot[] = [];
  if (sourceVersionId) {
    sourceSlots = await db.timetable_slot
      .filter(s => s.deleted_at === null && s.version_id === sourceVersionId)
      .toArray();
  } else {
    // If no version specified, copy all slots without version_id or with any active version
    sourceSlots = await db.timetable_slot
      .filter(s => s.deleted_at === null)
      .toArray();
  }

  // Clone each slot for the new version
  for (const slot of sourceSlots) {
    await createTimetableSlot({
      course_id: slot.course_id,
      version_id: newVersion.id,
      weekday: slot.weekday,
      start_time: slot.start_time,
      end_time: slot.end_time,
      room: slot.room,
      faculty: slot.faculty || null,
      component_type: slot.component_type,
      weight: slot.weight || 1,
      period_name: slot.period_name || null,
    });
  }

  return newVersion;
}

// ============================================================================
// ONE-OFF DATE OVERRIDES
// ============================================================================

export async function getTimetableOverrides(termId?: string): Promise<TimetableOverride[]> {
  const all = await db.timetable_override.filter(o => o.deleted_at === null).toArray();
  if (termId) {
    return all.filter(o => o.term_id === termId);
  }
  return all;
}

export async function getTimetableOverridesForDate(date: string): Promise<TimetableOverride[]> {
  return db.timetable_override
    .where('date')
    .equals(date)
    .filter(o => o.deleted_at === null)
    .toArray();
}

export async function createTimetableOverride(
  data: Omit<TimetableOverride, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<TimetableOverride> {
  const now = new Date().toISOString();
  const newOverride: TimetableOverride = {
    ...data,
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(timetableOverrideSchema, newOverride);
  await db.timetable_override.put(newOverride);
  return newOverride;
}

export async function deleteTimetableOverride(id: string): Promise<void> {
  await db.timetable_override.update(id, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

// ============================================================================
// RESOLVE EFFECTIVE DAILY SCHEDULE
// ============================================================================

export async function getEffectiveDaySchedule(dateStr?: string): Promise<DayScheduleResolution> {
  const date = dateStr || new Date().toISOString().slice(0, 10);

  const [versions, slots, calendarEvents, overrides, terms, courses] = await Promise.all([
    db.timetable_version.filter(v => v.deleted_at === null).toArray(),
    db.timetable_slot.filter(s => s.deleted_at === null).toArray(),
    db.calendar_event.filter(e => e.deleted_at === null).toArray(),
    db.timetable_override.where('date').equals(date).filter(o => o.deleted_at === null).toArray(),
    db.term.filter(t => t.deleted_at === null).toArray(),
    db.course.filter(c => c.deleted_at === null).toArray(),
  ]);

  const activeTerm = terms.find(t => t.status === 'ongoing') || terms[0];
  const workingDays = activeTerm?.working_days || [1, 2, 3, 4, 5, 6];

  return resolveDaySchedule({
    date,
    versions,
    slots,
    calendarEvents,
    overrides,
    workingDays,
    saturdayRule: activeTerm?.saturday_rule || 'second_saturday_off',
    courses,
    labAttendanceRule: getLabAttendanceRule(),
  });
}

export async function getTodayTimetableSlots(): Promise<{
  slots: TimetableSlot[];
  isHoliday: boolean;
  holidayNote?: string;
  isSwapDay: boolean;
  swapNote?: string;
  effectiveWeekday: Weekday;
}> {
  const schedule = await getEffectiveDaySchedule();
  const mappedSlots: TimetableSlot[] = schedule.slots.map(s => ({
    id: s.slot_id || generateUUID(),
    user_id: LOCAL_USER_ID,
    course_id: s.course_id,
    weekday: schedule.effective_weekday,
    start_time: s.start_time,
    end_time: s.end_time,
    room: s.room,
    faculty: s.faculty,
    component_type: s.component_type,
    weight: s.weight,
    attendance_weight: s.attendance_weight,
    period_name: s.period_name,
    created_at: '',
    updated_at: '',
    deleted_at: null,
  }));

  return {
    slots: mappedSlots,
    isHoliday: schedule.is_holiday,
    holidayNote: schedule.holiday_note || undefined,
    isSwapDay: schedule.is_swap_day,
    swapNote: schedule.is_swap_day ? `Following day ${schedule.effective_weekday} timetable` : undefined,
    effectiveWeekday: schedule.effective_weekday,
  };
}

