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
import {
  TimetableVersion,
  TimetableOverride,
} from '../types';
import { resolveDaySchedule } from './timetable';

export interface RemainingScheduledClassesOptions {
  versions?: TimetableVersion[];
  overrides?: TimetableOverride[];
  workingDays?: Weekday[];
}

/**
 * Calculates remaining scheduled occurrences / periods for a specific course
 * from startDate to endDate inclusive, accounting for:
 * - Timetable versions with effective_from
 * - Calendar holidays (single & range holidays)
 * - Swap days (e.g. Saturday follows Monday timetable)
 * - One-off overrides (cancels, substitutes, extra classes)
 * - Slot weights (e.g. 2-period lab counts as 2)
 * - Configurable working days
 */
export function countRemainingScheduledClasses(
  courseId: string,
  startDateStr: string, // YYYY-MM-DD
  endDateStr: string,   // YYYY-MM-DD
  slots: TimetableSlot[],
  events: CalendarEvent[],
  options?: RemainingScheduledClassesOptions
): number {
  if (startDateStr > endDateStr) return 0;

  const versions = options?.versions || [];
  const overrides = options?.overrides || [];
  const workingDays = options?.workingDays || [1, 2, 3, 4, 5, 6];

  let totalClasses = 0;
  const current = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const daySchedule = resolveDaySchedule({
      date: dateStr,
      versions,
      slots,
      calendarEvents: events,
      overrides,
      workingDays,
    });

    if (!daySchedule.is_holiday) {
      // Find all slots for this course on this day and sum their weights
      const courseSlots = daySchedule.slots.filter(s => s.course_id === courseId);
      for (const cs of courseSlots) {
        totalClasses += cs.weight;
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return totalClasses;
}

