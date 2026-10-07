/**
 * Calendar Repository
 * Manages holidays, date-range holidays, swap days, exams, and general events.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { CalendarEvent, CalendarEventType, Weekday } from '../../types';
import { calendarEventSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { ParsedHoliday } from '../../engine/timetable';

export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return db.calendar_event
    .filter(e => e.deleted_at === null)
    .toArray()
    .then(events => events.sort((a, b) => a.date.localeCompare(b.date)));
}

export async function getCalendarEventsForDate(date: string): Promise<CalendarEvent[]> {
  return db.calendar_event
    .filter(e => {
      if (e.deleted_at !== null) return false;
      if (e.end_date) {
        return date >= e.date && date <= e.end_date;
      }
      return e.date === date;
    })
    .toArray();
}

export async function createCalendarEvent(params: {
  date: string;
  endDate?: string | null;
  type: CalendarEventType;
  swapTargetWeekday?: Weekday | null;
  note?: string | null;
}): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const event: CalendarEvent = {
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    date: params.date,
    end_date: params.endDate || null,
    type: params.type,
    swap_target_weekday: params.swapTargetWeekday ?? null,
    note: params.note || null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(calendarEventSchema, event);
  await db.calendar_event.put(event);
  return event;
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await db.calendar_event.update(id, {
    deleted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}

/**
 * Bulk creates holidays parsed from user input.
 */
export async function bulkCreateHolidays(holidays: ParsedHoliday[]): Promise<CalendarEvent[]> {
  const created: CalendarEvent[] = [];
  for (const h of holidays) {
    const event = await createCalendarEvent({
      date: h.date,
      endDate: h.endDate,
      type: 'holiday',
      note: h.name,
    });
    created.push(event);
  }
  return created;
}
