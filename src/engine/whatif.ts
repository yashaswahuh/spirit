/**
 * Pure TypeScript What-If Attendance Simulator
 * Simulates the impact of skipping days or specific classes on attendance percentages and bunk counts.
 */

import { TimetableSlot, CalendarEvent, Weekday } from '../types';
import {
  calculateAttendancePercentage,
  calculateSafeBunks,
  calculateMustAttend,
  normalizeThreshold,
} from './attendance';

export interface SubjectAttendanceState {
  course_id: string;
  course_name: string;
  attended: number;
  conducted: number;
  threshold: number; // e.g. 75
}

export interface WhatIfCourseImpact {
  course_id: string;
  course_name: string;
  current_percentage: number;
  new_percentage: number;
  classes_skipped: number;
  current_safe_bunks: number;
  new_safe_bunks: number;
  current_must_attend: number;
  new_must_attend: number;
  remains_safe: boolean; // true if new_percentage >= threshold
  percentage_change: number; // negative value representing drop
}

export interface WhatIfSimulationResult {
  total_classes_skipped: number;
  courses_in_danger_count: number; // count of courses dropping below threshold
  impacts: WhatIfCourseImpact[];
}

/**
 * Simulates skipping a specified number of classes per course.
 */
export function simulateSkippingClasses(
  subjects: SubjectAttendanceState[],
  skipCountsByCourseId: Record<string, number>
): WhatIfSimulationResult {
  let totalSkipped = 0;
  let inDangerCount = 0;
  const impacts: WhatIfCourseImpact[] = [];

  for (const subject of subjects) {
    const skipped = skipCountsByCourseId[subject.course_id] || 0;
    totalSkipped += skipped;

    const currentPct = calculateAttendancePercentage(subject.attended, subject.conducted);
    const newConducted = subject.conducted + skipped;
    const newAttended = subject.attended; // Skipped classes increase conducted but not attended
    const newPct = calculateAttendancePercentage(newAttended, newConducted);

    const normThreshold = normalizeThreshold(subject.threshold) * 100;
    const remainsSafe = newPct >= normThreshold;

    if (!remainsSafe && (currentPct >= normThreshold || subject.conducted === 0)) {
      inDangerCount++;
    }

    const currentSafeBunks = calculateSafeBunks(subject.attended, subject.conducted, subject.threshold);
    const newSafeBunks = calculateSafeBunks(newAttended, newConducted, subject.threshold);

    const currentMustAttend = calculateMustAttend(subject.attended, subject.conducted, subject.threshold);
    const newMustAttend = calculateMustAttend(newAttended, newConducted, subject.threshold);

    impacts.push({
      course_id: subject.course_id,
      course_name: subject.course_name,
      current_percentage: currentPct,
      new_percentage: newPct,
      classes_skipped: skipped,
      current_safe_bunks: currentSafeBunks,
      new_safe_bunks: newSafeBunks,
      current_must_attend: currentMustAttend,
      new_must_attend: newMustAttend,
      remains_safe: remainsSafe,
      percentage_change: newPct - currentPct,
    });
  }

  return {
    total_classes_skipped: totalSkipped,
    courses_in_danger_count: inDangerCount,
    impacts,
  };
}

/**
 * Simulates skipping a set of dates (e.g. "If I take off this Friday and next Monday").
 * Determines which slots happen on each skipped date, considering holidays and swap days.
 */
import {
  TimetableVersion,
  TimetableOverride,
} from '../types';
import { resolveDaySchedule } from './timetable';

export interface WhatIfScheduleContext {
  versions?: TimetableVersion[];
  slots: TimetableSlot[];
  calendarEvents: CalendarEvent[];
  overrides?: TimetableOverride[];
  workingDays?: Weekday[];
}

/**
 * Simulates skipping a set of dates (e.g. specific dates).
 * Accurately calculates missed periods taking into account versions, overrides, range holidays, and weights.
 */
export function simulateSkippingDates(
  datesToSkip: string[], // YYYY-MM-DD
  subjects: SubjectAttendanceState[],
  slots: TimetableSlot[],
  events: CalendarEvent[],
  context?: Partial<WhatIfScheduleContext>
): WhatIfSimulationResult {
  const versions = context?.versions || [];
  const overrides = context?.overrides || [];
  const workingDays = context?.workingDays || [1, 2, 3, 4, 5, 6];

  const skipCounts: Record<string, number> = {};

  for (const dateStr of datesToSkip) {
    const daySchedule = resolveDaySchedule({
      date: dateStr,
      versions,
      slots,
      calendarEvents: events,
      overrides,
      workingDays,
    });

    if (!daySchedule.is_holiday) {
      for (const slot of daySchedule.slots) {
        skipCounts[slot.course_id] = (skipCounts[slot.course_id] || 0) + slot.weight;
      }
    }
  }

  return simulateSkippingClasses(subjects, skipCounts);
}

/**
 * Simulates skipping "every [Weekday]" (e.g. every Friday) from startDate to endDate.
 */
export function simulateSkippingRecurringWeekday(
  weekday: Weekday,
  startDateStr: string,
  endDateStr: string,
  subjects: SubjectAttendanceState[],
  context: WhatIfScheduleContext
): WhatIfSimulationResult {
  const dates: string[] = [];
  const current = new Date(startDateStr + 'T00:00:00Z');
  const end = new Date(endDateStr + 'T00:00:00Z');

  while (current <= end) {
    if (current.getUTCDay() === weekday) {
      dates.push(current.toISOString().slice(0, 10));
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return simulateSkippingDates(dates, subjects, context.slots, context.calendarEvents, context);
}

/**
 * Simulates skipping the next N upcoming instructional days.
 */
export function simulateSkippingNUpcomingDays(
  nDays: number,
  startDateStr: string,
  subjects: SubjectAttendanceState[],
  context: WhatIfScheduleContext
): WhatIfSimulationResult {
  const dates: string[] = [];
  const current = new Date(startDateStr + 'T00:00:00Z');
  let counted = 0;
  let safetyLimit = 60; // Max scan limit

  while (counted < nDays && safetyLimit > 0) {
    const dateStr = current.toISOString().slice(0, 10);
    const daySchedule = resolveDaySchedule({
      date: dateStr,
      versions: context.versions || [],
      slots: context.slots,
      calendarEvents: context.calendarEvents,
      overrides: context.overrides || [],
      workingDays: context.workingDays || [1, 2, 3, 4, 5, 6],
    });

    if (!daySchedule.is_holiday && daySchedule.is_working_day && daySchedule.slots.length > 0) {
      dates.push(dateStr);
      counted++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
    safetyLimit--;
  }

  return simulateSkippingDates(dates, subjects, context.slots, context.calendarEvents, context);
}

export interface CanISkipTomorrowSubjectStatus {
  course_id: string;
  course_name: string;
  classes_tomorrow: number; // Periods scheduled tomorrow
  current_percentage: number;
  new_percentage: number;
  threshold: number;
  can_skip: boolean;
  safe_bunks_remaining: number;
}

export interface CanISkipTomorrowResult {
  date: string;
  is_holiday: boolean;
  holiday_note: string | null;
  has_classes: boolean;
  can_skip_all: boolean;
  subjects: CanISkipTomorrowSubjectStatus[];
  in_danger_courses_count: number;
}

/**
 * Computes whether a student can safely skip tomorrow's classes without any subject dropping below threshold.
 */
export function canISkipTomorrow(
  tomorrowDateStr: string,
  subjects: SubjectAttendanceState[],
  context: WhatIfScheduleContext
): CanISkipTomorrowResult {
  const daySchedule = resolveDaySchedule({
    date: tomorrowDateStr,
    versions: context.versions || [],
    slots: context.slots,
    calendarEvents: context.calendarEvents,
    overrides: context.overrides || [],
    workingDays: context.workingDays || [1, 2, 3, 4, 5, 6],
  });

  if (daySchedule.is_holiday) {
    return {
      date: tomorrowDateStr,
      is_holiday: true,
      holiday_note: daySchedule.holiday_note,
      has_classes: false,
      can_skip_all: true,
      subjects: [],
      in_danger_courses_count: 0,
    };
  }

  // Count tomorrow's scheduled classes per course
  const tomorrowClassesByCourse: Record<string, number> = {};
  for (const slot of daySchedule.slots) {
    tomorrowClassesByCourse[slot.course_id] =
      (tomorrowClassesByCourse[slot.course_id] || 0) + slot.weight;
  }

  const subjectResults: CanISkipTomorrowSubjectStatus[] = [];
  let inDangerCount = 0;

  for (const sub of subjects) {
    const classesTomorrow = tomorrowClassesByCourse[sub.course_id] || 0;
    const currentPct = calculateAttendancePercentage(sub.attended, sub.conducted);
    const newConducted = sub.conducted + classesTomorrow;
    const newAttended = sub.attended;
    const newPct = calculateAttendancePercentage(newAttended, newConducted);
    const normThreshold = normalizeThreshold(sub.threshold) * 100;

    const canSkip = newPct >= normThreshold || classesTomorrow === 0;
    if (!canSkip && (currentPct >= normThreshold || sub.conducted === 0)) {
      inDangerCount++;
    }

    const safeBunksAfter = calculateSafeBunks(newAttended, newConducted, sub.threshold);

    subjectResults.push({
      course_id: sub.course_id,
      course_name: sub.course_name,
      classes_tomorrow: classesTomorrow,
      current_percentage: currentPct,
      new_percentage: newPct,
      threshold: normThreshold,
      can_skip: canSkip,
      safe_bunks_remaining: safeBunksAfter,
    });
  }

  const hasClasses = daySchedule.slots.length > 0;
  const canSkipAll = inDangerCount === 0;

  return {
    date: tomorrowDateStr,
    is_holiday: false,
    holiday_note: null,
    has_classes: hasClasses,
    can_skip_all: canSkipAll,
    subjects: subjectResults,
    in_danger_courses_count: inDangerCount,
  };
}

