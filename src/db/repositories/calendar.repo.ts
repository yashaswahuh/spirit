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

/**
 * Reverts a holiday marked for a given date, restoring scheduled classes.
 * Soft-deletes holiday calendar events and clears any attendance records marked 'holiday'.
 */
export async function revertHolidayForDate(date: string): Promise<boolean> {
  const now = new Date().toISOString();
  const events = await db.calendar_event
    .filter(e => {
      if (e.deleted_at !== null || e.type !== 'holiday') return false;
      if (e.end_date) {
        return date >= e.date && date <= e.end_date;
      }
      return e.date === date;
    })
    .toArray();

  if (events.length === 0) {
    // Check if attendance records were marked as holiday without a calendar event
    const holidayRecords = await db.attendance_record
      .filter(r => r.date === date && r.status === 'holiday' && r.deleted_at === null)
      .toArray();

    if (holidayRecords.length === 0) return false;

    for (const r of holidayRecords) {
      await db.attendance_record.update(r.id, {
        deleted_at: now,
        updated_at: now,
      });
    }
    return true;
  }

  for (const h of events) {
    await db.calendar_event.update(h.id, {
      deleted_at: now,
      updated_at: now,
    });
  }

  // Clear any attendance records marked 'holiday' for that date
  const records = await db.attendance_record
    .filter(r => r.date === date && r.status === 'holiday' && r.deleted_at === null)
    .toArray();

  for (const r of records) {
    await db.attendance_record.update(r.id, {
      deleted_at: now,
      updated_at: now,
    });
  }

  return true;
}


