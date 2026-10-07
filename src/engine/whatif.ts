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
export function simulateSkippingDates(
  datesToSkip: string[], // YYYY-MM-DD
  subjects: SubjectAttendanceState[],
  slots: TimetableSlot[],
  events: CalendarEvent[]
): WhatIfSimulationResult {
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

  // Count how many classes for each course are on these dates
  const skipCounts: Record<string, number> = {};

  for (const dateStr of datesToSkip) {
    // If it's a holiday, skipping it doesn't count as missing classes
    if (holidayDates.has(dateStr)) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const regularWeekday = date.getDay() as Weekday;
    const effectiveWeekday = swapDays.has(dateStr)
      ? swapDays.get(dateStr)!
      : regularWeekday;

    // Find slots on this day
    const activeSlots = slots.filter(s => !s.deleted_at && s.weekday === effectiveWeekday);
    for (const slot of activeSlots) {
      skipCounts[slot.course_id] = (skipCounts[slot.course_id] || 0) + 1;
    }
  }

  return simulateSkippingClasses(subjects, skipCounts);
}

