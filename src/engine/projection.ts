/**
 * Pure TypeScript Attendance Projection Engine
 * Computes best-case, worst-case, and target classes needed out of remaining term sessions.
 */

import { AttendanceProjection, TimetableSlot, CalendarEvent, Weekday } from '../types';
import { normalizeThreshold } from './attendance';

export interface ProjectionInput {
  attended: number;
  conducted: number;
  threshold: number;
  remainingClasses: number;
}

/**
 * Computes best-case, worst-case, and needed classes out of remaining scheduled sessions.
 */
export function calculateAttendanceProjection(input: ProjectionInput): AttendanceProjection {
  const { attended, conducted, threshold, remainingClasses } = input;
  const totalProjected = conducted + remainingClasses;
  const t = normalizeThreshold(threshold);

  if (totalProjected <= 0) {
    return {
      total_projected_classes: 0,
      best_case_percentage: 100.0,
      worst_case_percentage: 100.0,
      classes_needed_to_finish_at_threshold: 0,
      can_meet_threshold: true,
    };
  }

  const bestAttended = attended + remainingClasses;
  const bestCasePercentage = Math.min(100.0, Math.max(0.0, (bestAttended / totalProjected) * 100));
  const worstCasePercentage = Math.min(100.0, Math.max(0.0, (attended / totalProjected) * 100));

  // Determine minimum classes needed out of remainingClasses
  // (attended + needed) / totalProjected >= t
  // needed >= t * totalProjected - attended
  const rawNeeded = Math.ceil(t * totalProjected - attended);
  const classesNeeded = Math.max(0, rawNeeded);
  const canMeetThreshold = classesNeeded <= remainingClasses;

  return {
    total_projected_classes: totalProjected,
    best_case_percentage: bestCasePercentage,
    worst_case_percentage: worstCasePercentage,
    classes_needed_to_finish_at_threshold: classesNeeded,
    can_meet_threshold: canMeetThreshold,
  };
}

/**
 * Calculates remaining scheduled occurrences for a specific course
 * from startDate to endDate inclusive, accounting for:
 * - Timetable slots per weekday
 * - Calendar holidays (classes cancelled)
 * - Swap days (e.g. Saturday follows Monday timetable)
 */
export function countRemainingScheduledClasses(
  courseId: string,
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string,   // YYYY-MM-DD
  slots: TimetableSlot[],
  events: CalendarEvent[]
): number {
  const courseSlots = slots.filter(s => s.course_id === courseId && !s.deleted_at);
  if (courseSlots.length === 0) return 0;

  // Map events by date (YYYY-MM-DD)
  const holidayDates = new Set<string>();
  const swapDays = new Map<string, Weekday>();

  for (const event of events) {
    if (event.deleted_at) continue;
    if (event.type === 'holiday') {
      holidayDates.add(event.date);
    } else if (event.type === 'swap_day' && event.swap_target_weekday !== null) {
      swapDays.set(event.date, event.swap_target_weekday);
    }
  }

  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return 0;
  }

  let totalClasses = 0;
  const current = new Date(start);

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);

    // If it's a holiday, no classes conducted
    if (!holidayDates.has(dateStr)) {
      // Determine effective weekday (0 = Sun, 1 = Mon ... 6 = Sat)
      const regularWeekday = current.getDay() as Weekday;
      const effectiveWeekday = swapDays.has(dateStr)
        ? swapDays.get(dateStr)!
        : regularWeekday;

      // Count slots matching this effective weekday
      const slotsForDay = courseSlots.filter(s => s.weekday === effectiveWeekday);
      totalClasses += slotsForDay.length;
    }

    current.setDate(current.getDate() + 1);
  }

  return totalClasses;
}

