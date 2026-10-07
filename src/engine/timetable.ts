/**
 * Spirit Timetable & Schedule Engine
 * Pure TypeScript functions for timetable version resolution,
 * effective daily schedule generation, holiday expansion, slot overlap detection,
 * and one-off overrides. Zero React dependencies.
 */

import {
  TimetableSlot,
  TimetableVersion,
  TimetableOverride,
  CalendarEvent,
  Weekday,
  CourseType,
} from '../types';

export interface EffectiveSlot {
  slot_id: string | null; // null if extra class
  course_id: string;
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  room: string | null;
  faculty: string | null;
  component_type: CourseType;
  weight: number; // Periods it counts for (e.g. 1, 2, 3)
  period_name: string | null;
  is_override: boolean;
  override_action?: 'cancel' | 'substitute' | 'extra' | 'reschedule';
  override_id?: string;
  note?: string;
}

export interface DayScheduleResolution {
  date: string; // YYYY-MM-DD
  weekday: Weekday;
  is_working_day: boolean;
  is_holiday: boolean;
  holiday_note: string | null;
  is_swap_day: boolean;
  swap_source_weekday?: Weekday;
  effective_weekday: Weekday;
  is_exam_day: boolean;
  exam_note: string | null;
  slots: EffectiveSlot[];
  total_periods: number;
}

export interface SlotOverlapWarning {
  slotA: TimetableSlot;
  slotB: TimetableSlot;
  weekday: Weekday;
  message: string;
}

export interface ParsedHoliday {
  date: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  name: string;
}

/**
 * Converts "HH:mm" time string to minutes from midnight
 */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Detects overlapping time slots on the same weekday.
 * Allows overlaps (e.g. parallel electives, lab batches) while reporting warnings.
 */
export function detectSlotOverlaps(slots: TimetableSlot[]): SlotOverlapWarning[] {
  const activeSlots = slots.filter(s => !s.deleted_at);
  const warnings: SlotOverlapWarning[] = [];
  const checkedPairs = new Set<string>();

  for (let i = 0; i < activeSlots.length; i++) {
    for (let j = i + 1; j < activeSlots.length; j++) {
      const a = activeSlots[i];
      const b = activeSlots[j];

      // Must be on the same weekday and same timetable version
      if (a.weekday !== b.weekday) continue;
      if (a.version_id && b.version_id && a.version_id !== b.version_id) continue;

      const pairKey = [a.id, b.id].sort().join(':');
      if (checkedPairs.has(pairKey)) continue;

      const aStart = timeToMinutes(a.start_time);
      const aEnd = timeToMinutes(a.end_time);
      const bStart = timeToMinutes(b.start_time);
      const bEnd = timeToMinutes(b.end_time);

      // Overlap condition: startA < endB && endA > startB
      if (aStart < bEnd && aEnd > bStart) {
        checkedPairs.add(pairKey);
        warnings.push({
          slotA: a,
          slotB: b,
          weekday: a.weekday,
          message: `Overlap between ${a.start_time}-${a.end_time} and ${b.start_time}-${b.end_time}`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Finds the effective timetable version active on a given date (YYYY-MM-DD).
 * Versions are filtered by effective_from <= date, sorted descending by effective_from.
 * If none exist before the date, returns the earliest available version.
 */
export function resolveEffectiveTimetableVersion(
  versions: TimetableVersion[],
  date: string
): TimetableVersion | null {
  const activeVersions = versions.filter(v => !v.deleted_at);
  if (activeVersions.length === 0) return null;

  // Versions whose effective_from <= date
  const applicable = activeVersions
    .filter(v => v.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from));

  if (applicable.length > 0) {
    return applicable[0];
  }

  // Fallback: earliest version
  const sorted = [...activeVersions].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  return sorted[0];
}

/**
 * Parses user-pasted holiday text lines.
 * Supported formats:
 * - 2026-10-15: Dussehra
 * - 2026-10-15 Dussehra
 * - 2026-10-15 to 2026-10-18: Diwali Break
 * - 2026-10-15 - 2026-10-18 Diwali Break
 * - 15/10/2026 - Dussehra
 */
export function parsePastedHolidays(input: string): ParsedHoliday[] {
  const lines = input.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const results: ParsedHoliday[] = [];

  const isoRangeRegex = /^(\d{4}-\d{2}-\d{2})\s*(?:to|-)\s*(\d{4}-\d{2}-\d{2})[:\s-]+(.*)$/i;
  const isoSingleRegex = /^(\d{4}-\d{2}-\d{2})[:\s-]+(.*)$/i;
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})[:\s-]+(.*)$/i;

  for (const line of lines) {
    // 1. Check ISO range
    const rangeMatch = line.match(isoRangeRegex);
    if (rangeMatch) {
      results.push({
        date: rangeMatch[1],
        endDate: rangeMatch[2],
        name: rangeMatch[3].trim() || 'Holiday',
      });
      continue;
    }

    // 2. Check ISO single
    const singleMatch = line.match(isoSingleRegex);
    if (singleMatch) {
      results.push({
        date: singleMatch[1],
        name: singleMatch[2].trim() || 'Holiday',
      });
      continue;
    }

    // 3. Check DD/MM/YYYY
    const dmyMatch = line.match(dmyRegex);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      results.push({
        date: `${year}-${month}-${day}`,
        name: dmyMatch[4].trim() || 'Holiday',
      });
    }
  }

  return results;
}

/**
 * Expands a date range [startDate, endDate] inclusive into an array of ISO dates (YYYY-MM-DD).
 */
export function expandDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [startDate];

  const dates: string[] = [];
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return dates;
}

export interface ResolveDayScheduleParams {
  date: string; // YYYY-MM-DD
  versions: TimetableVersion[];
  slots: TimetableSlot[];
  calendarEvents: CalendarEvent[];
  overrides?: TimetableOverride[];
  workingDays?: Weekday[]; // default [1, 2, 3, 4, 5, 6] (Mon-Sat)
}

/**
 * Resolves the complete effective schedule for a specific date.
 * Takes into account:
 * 1. Timetable versions (effective_from)
 * 2. Calendar events (holidays, range holidays, swap days, exams)
 * 3. Working days of the term
 * 4. One-off date overrides (cancel, substitute, extra, reschedule)
 * 5. Slot weights
 */
export function resolveDaySchedule(params: ResolveDayScheduleParams): DayScheduleResolution {
  const {
    date,
    versions,
    slots,
    calendarEvents,
    overrides = [],
    workingDays = [1, 2, 3, 4, 5, 6],
  } = params;

  const dateObj = new Date(date + 'T00:00:00Z');
  const regularWeekday = dateObj.getUTCDay() as Weekday;

  // Check if date falls in any holiday event (single date or range)
  const holidayEvent = calendarEvents.find(e => {
    if (e.deleted_at || e.type !== 'holiday') return false;
    if (e.end_date) {
      return date >= e.date && date <= e.end_date;
    }
    return e.date === date;
  });

  if (holidayEvent) {
    return {
      date,
      weekday: regularWeekday,
      is_working_day: false,
      is_holiday: true,
      holiday_note: holidayEvent.note || 'Holiday',
      is_swap_day: false,
      effective_weekday: regularWeekday,
      is_exam_day: false,
      exam_note: null,
      slots: [],
      total_periods: 0,
    };
  }

  // Check swap day event
  const swapEvent = calendarEvents.find(
    e => !e.deleted_at && e.type === 'swap_day' && e.date === date
  );

  let effectiveWeekday = regularWeekday;
  let isSwapDay = false;
  let swapSourceWeekday: Weekday | undefined;

  if (swapEvent && swapEvent.swap_target_weekday !== null && swapEvent.swap_target_weekday !== undefined) {
    isSwapDay = true;
    swapSourceWeekday = regularWeekday;
    effectiveWeekday = swapEvent.swap_target_weekday;
  }

  // Check exam or general event
  const examEvent = calendarEvents.find(
    e => !e.deleted_at && e.type === 'exam' && (e.end_date ? date >= e.date && date <= e.end_date : e.date === date)
  );

  const isWorkingDay = workingDays.includes(effectiveWeekday);

  // If not a working day and not swapped to a working day, base slots are empty
  const activeSlots = slots.filter(s => !s.deleted_at);
  const activeVersion = resolveEffectiveTimetableVersion(versions, date);

  let baseDaySlots: TimetableSlot[] = [];
  if (isWorkingDay || isSwapDay) {
    baseDaySlots = activeSlots.filter(s => {
      if (s.weekday !== effectiveWeekday) return false;
      if (activeVersion && s.version_id) {
        return s.version_id === activeVersion.id;
      }
      return true;
    });
  }

  // Map to EffectiveSlot
  let effectiveSlots: EffectiveSlot[] = baseDaySlots.map(s => ({
    slot_id: s.id,
    course_id: s.course_id,
    start_time: s.start_time,
    end_time: s.end_time,
    room: s.room,
    faculty: s.faculty || null,
    component_type: s.component_type,
    weight: s.weight && s.weight > 0 ? s.weight : 1,
    period_name: s.period_name || null,
    is_override: false,
  }));

  // Apply one-off overrides for this date
  const dayOverrides = overrides.filter(o => !o.deleted_at && o.date === date);

  for (const override of dayOverrides) {
    switch (override.action) {
      case 'cancel': {
        if (override.original_slot_id) {
          effectiveSlots = effectiveSlots.filter(s => s.slot_id !== override.original_slot_id);
        }
        break;
      }
      case 'substitute': {
        if (override.original_slot_id) {
          effectiveSlots = effectiveSlots.map(s => {
            if (s.slot_id === override.original_slot_id) {
              return {
                ...s,
                course_id: override.course_id,
                faculty: override.faculty ?? s.faculty,
                room: override.room ?? s.room,
                weight: override.weight > 0 ? override.weight : s.weight,
                is_override: true,
                override_action: 'substitute',
                override_id: override.id,
                note: override.note || undefined,
              };
            }
            return s;
          });
        }
        break;
      }
      case 'reschedule': {
        if (override.original_slot_id) {
          effectiveSlots = effectiveSlots.map(s => {
            if (s.slot_id === override.original_slot_id) {
              return {
                ...s,
                start_time: override.start_time,
                end_time: override.end_time,
                room: override.room ?? s.room,
                is_override: true,
                override_action: 'reschedule',
                override_id: override.id,
                note: override.note || undefined,
              };
            }
            return s;
          });
        }
        break;
      }
      case 'extra': {
        effectiveSlots.push({
          slot_id: null,
          course_id: override.course_id,
          start_time: override.start_time,
          end_time: override.end_time,
          room: override.room,
          faculty: override.faculty,
          component_type: override.component_type,
          weight: override.weight > 0 ? override.weight : 1,
          period_name: null,
          is_override: true,
          override_action: 'extra',
          override_id: override.id,
          note: override.note || undefined,
        });
        break;
      }
    }
  }

  // Sort chronologically by start time
  effectiveSlots.sort((a, b) => a.start_time.localeCompare(b.start_time));

  const totalPeriods = effectiveSlots.reduce((acc, s) => acc + s.weight, 0);

  return {
    date,
    weekday: regularWeekday,
    is_working_day: isWorkingDay,
    is_holiday: false,
    holiday_note: null,
    is_swap_day: isSwapDay,
    swap_source_weekday: swapSourceWeekday,
    effective_weekday: effectiveWeekday,
    is_exam_day: !!examEvent,
    exam_note: examEvent?.note || null,
    slots: effectiveSlots,
    total_periods: totalPeriods,
  };
}
