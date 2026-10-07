/**
 * Timetable Repository
 * Handles class schedules and resolves today's effective slots.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { TimetableSlot, Weekday } from '../../types';
import { timetableSlotSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';

export async function getTimetableSlots(): Promise<TimetableSlot[]> {
  return db.timetable_slot.filter(s => s.deleted_at === null).toArray();
}

export async function getTimetableSlotsForWeekday(weekday: Weekday): Promise<TimetableSlot[]> {
  return db.timetable_slot
    .where('weekday')
    .equals(weekday)
    .filter(s => s.deleted_at === null)
    .toArray();
}

/**
 * Resolves today's active slots taking into account calendar events:
 * - If today is a holiday: returns empty list.
 * - If today is a swap_day: returns slots for the swap target weekday.
 * - Otherwise: returns slots for today's standard weekday.
 */
export async function getTodayTimetableSlots(): Promise<{
  slots: TimetableSlot[];
  isHoliday: boolean;
  holidayNote?: string;
  isSwapDay: boolean;
  swapNote?: string;
  effectiveWeekday: Weekday;
}> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const regularWeekday = today.getDay() as Weekday;

  // Check calendar events for today
  const event = await db.calendar_event
    .where('date')
    .equals(dateStr)
    .filter(e => e.deleted_at === null)
    .first();

  if (event && event.type === 'holiday') {
    return {
      slots: [],
      isHoliday: true,
      holidayNote: event.note ?? 'Holiday',
      isSwapDay: false,
      effectiveWeekday: regularWeekday,
    };
  }

  let effectiveWeekday = regularWeekday;
  let isSwapDay = false;
  let swapNote: string | undefined;

  if (event && event.type === 'swap_day' && event.swap_target_weekday !== null && event.swap_target_weekday !== undefined) {
    effectiveWeekday = event.swap_target_weekday as Weekday;
    isSwapDay = true;
    swapNote = event.note ?? `Following timetable for day ${effectiveWeekday}`;
  }

  const allSlots = await getTimetableSlotsForWeekday(effectiveWeekday);
  // Sort slots by start_time ascending
  const sorted = allSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return {
    slots: sorted,
    isHoliday: false,
    isSwapDay,
    swapNote,
    effectiveWeekday,
  };
}

export async function createTimetableSlot(
  data: Omit<TimetableSlot, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<TimetableSlot> {
  const now = new Date().toISOString();
  const newSlot: TimetableSlot = {
    ...data,
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(timetableSlotSchema, newSlot);
  await db.timetable_slot.put(newSlot);
  return newSlot;
}

export async function deleteTimetableSlot(id: string): Promise<void> {
  await db.timetable_slot.update(id, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}
