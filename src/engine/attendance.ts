/**
 * Pure TypeScript Attendance Calculation Engine
 * Zero React dependencies.
 */

import { AttendanceRecord, CourseAttendanceRules, AttendanceStats, CourseType, LabAttendanceRule, TimetableSlot } from '../types';
import { timeToMinutes } from './timetable';

/**
 * Normalizes threshold input to a decimal fraction in (0, 1].
 * For example: 75 -> 0.75, 0.75 -> 0.75, 100 -> 1.0.
 */
export function normalizeThreshold(threshold: number): number {
  if (threshold <= 0) return 0.01;
  if (threshold > 1) return threshold / 100;
  return threshold;
}

/**
 * Calculates current attendance percentage.
 * If no classes conducted, returns 100.0%.
 */
export function calculateAttendancePercentage(attended: number, conducted: number): number {
  if (conducted <= 0) return 100.0;
  if (attended <= 0) return 0.0;
  const pct = (attended / conducted) * 100;
  return Math.min(100.0, Math.max(0.0, pct));
}

/**
 * Calculates Safe Bunks:
 * The maximum number of consecutive classes a student can miss while keeping attendance >= threshold.
 * Formula: floor(attended / t - conducted), minimum 0.
 *
 * Edge cases:
 * - conducted = 0 -> 0
 * - attended / conducted < threshold -> 0
 */
export function calculateSafeBunks(attended: number, conducted: number, threshold: number): number {
  if (conducted <= 0 || attended <= 0) return 0;
  const t = normalizeThreshold(threshold);
  const currentRatio = attended / conducted;
  if (currentRatio < t) return 0;

  const maxAllowedConducted = Math.floor(attended / t);
  const safe = maxAllowedConducted - conducted;
  return Math.max(0, safe);
}

/**
 * Calculates Must Attend:
 * The minimum number of consecutive classes a student must attend to reach or recover attendance >= threshold.
 * Formula: ceil((t * conducted - attended) / (1 - t)).
 *
 * Edge cases:
 * - conducted = 0 -> 0 (nothing conducted yet)
 * - attended / conducted >= threshold -> 0 (already safe)
 * - t = 1 (100%): if attended < conducted, 100% is mathematically impossible once a class is missed -> returns Infinity
 */
export function calculateMustAttend(attended: number, conducted: number, threshold: number): number {
  if (conducted <= 0) return 0;
  const t = normalizeThreshold(threshold);
  const currentRatio = attended / conducted;
  if (currentRatio >= t) return 0;

  // If threshold is 100% and student already missed at least one class
  if (t >= 1.0) {
    return Infinity;
  }

  const needed = Math.ceil((t * conducted - attended) / (1 - t));
  return Math.max(0, needed);
}

export interface CourseAttendanceCalculationOptions {
  initialAttended?: number;
  initialConducted?: number;
  trackingStartDate?: string | null;
  slots?: TimetableSlot[];
  slotsMap?: Map<string, TimetableSlot>;
  courseType?: CourseType;
  labAttendanceRule?: LabAttendanceRule | null;
  globalLabRule?: LabAttendanceRule;
}

/**
 * Computes comprehensive attendance stats for a course given its historical records and opening balance.
 * Follows rules:
 * - Opening balance (initialAttended, initialConducted) included in totals.
 * - Records prior to trackingStartDate (if set) are skipped to prevent double counting.
 * - Dynamic Attendance Counting Rule awareness:
 *   If rule is 'single_session', multi-period sessions (labs, NSS) count as 1 point.
 *   If rule is 'per_hour', multi-period sessions count as slot.weight (e.g. 2 points).
 * - 'cancelled' and 'holiday' are excluded from conducted count.
 * - 'medical' counts as present if rules.medical_counts_as_present is true.
 * - 'duty_leave' counts as present if rules.duty_leave_counts_as_present is true.
 * - If slots or slotsMap provided, computes separate theory and lab breakdowns for integrated courses.
 */
export function computeCourseAttendanceStats(
  records: AttendanceRecord[],
  rules: CourseAttendanceRules,
  threshold: number,
  options?: CourseAttendanceCalculationOptions
): AttendanceStats {
  let attended = Math.max(0, options?.initialAttended || 0);
  let conducted = Math.max(0, options?.initialConducted || 0);
  const trackingStart = options?.trackingStartDate;

  let theoryAttended = 0;
  let theoryConducted = 0;
  let labAttended = 0;
  let labConducted = 0;

  // Build slot lookup if slots array is provided
  const slotLookup = options?.slotsMap || (options?.slots ? new Map(options.slots.map(s => [s.id, s])) : undefined);
  const effectiveRule = options?.labAttendanceRule || options?.globalLabRule;

  for (const record of records) {
    if (record.deleted_at) continue;
    if (trackingStart && record.date < trackingStart) continue;

    let weight = record.weight && record.weight > 0 ? record.weight : 1;

    let compType = record.component_type;
    const slot = record.slot_id && slotLookup ? slotLookup.get(record.slot_id) : undefined;
    if (!compType && slot?.component_type) {
      compType = slot.component_type;
    }

    const diffMins = (slot?.start_time && slot?.end_time)
      ? timeToMinutes(slot.end_time) - timeToMinutes(slot.start_time)
      : 0;

    const courseSlots = options?.slots?.filter(s => s.course_id === record.course_id);
    const hasMultiPeriodSlot = courseSlots?.some(s => (s.weight && s.weight > 1) || s.component_type === 'lab') ?? false;

    // A session is considered a lab / multi-hour block if:
    // - explicitly marked as lab component_type
    // - course itself is a pure lab
    // - slot duration spans >= 90 mins (or has weight > 1)
    // - or course is lab/has multi-period slots and not an explicitly marked theory lecture
    const isTheoryLecture = compType === 'theory' && options?.courseType === 'theory_and_lab';
    const isLab = !isTheoryLecture && (
      compType === 'lab' ||
      options?.courseType === 'lab' ||
      diffMins >= 90 ||
      (slot && slot.weight !== undefined && slot.weight > 1) ||
      (record.weight !== undefined && record.weight > 1) ||
      hasMultiPeriodSlot
    );

    // Dynamic attendance rule evaluation for seamless, consistent updates across all days
    if (isLab || options?.labAttendanceRule !== undefined) {
      if (effectiveRule === 'single_session') {
        weight = 1;
      } else if (effectiveRule === 'per_hour') {
        const slotW = slot?.weight || (diffMins >= 150 ? 3 : diffMins >= 90 ? 2 : 0);
        const maxCourseSlotW = courseSlots?.reduce((max, s) => {
          const d = (s.start_time && s.end_time)
            ? timeToMinutes(s.end_time) - timeToMinutes(s.start_time)
            : 0;
          return Math.max(max, d >= 90 ? 2 : (s.weight || 1));
        }, 1) || 2;
        const targetW = slotW > 1 ? slotW : Math.max(2, maxCourseSlotW);
        weight = targetW;
      }
    }

    let isConducted = false;
    let isAttended = false;

    switch (record.status) {
      case 'present':
        isConducted = true;
        isAttended = true;
        break;
      case 'absent':
        isConducted = true;
        break;
      case 'medical':
        isConducted = true;
        if (rules.medical_counts_as_present) {
          isAttended = true;
        }
        break;
      case 'duty_leave':
        isConducted = true;
        if (rules.duty_leave_counts_as_present) {
          isAttended = true;
        }
        break;
      case 'cancelled':
      case 'holiday':
        // Cancelled and holidays are excluded from conducted
        break;
    }

    if (isConducted) {
      conducted += weight;
      if (isAttended) attended += weight;

      if (compType === 'theory') {
        theoryConducted += weight;
        if (isAttended) theoryAttended += weight;
      } else if (compType === 'lab') {
        labConducted += weight;
        if (isAttended) labAttended += weight;
      }
    }
  }

  const percentage = calculateAttendancePercentage(attended, conducted);
  const normThreshold = normalizeThreshold(threshold) * 100;
  const safe_bunks = calculateSafeBunks(attended, conducted, threshold);
  const must_attend = calculateMustAttend(attended, conducted, threshold);

  const theory = theoryConducted > 0 ? {
    attended: theoryAttended,
    conducted: theoryConducted,
    percentage: calculateAttendancePercentage(theoryAttended, theoryConducted),
  } : undefined;

  const lab = labConducted > 0 ? {
    attended: labAttended,
    conducted: labConducted,
    percentage: calculateAttendancePercentage(labAttended, labConducted),
  } : undefined;

  return {
    attended,
    conducted,
    percentage,
    threshold: normThreshold,
    safe_bunks,
    must_attend,
    is_in_danger: conducted > 0 && percentage < normThreshold,
    theory,
    lab,
  };
}

import { CalendarEvent, TimetableVersion, TimetableOverride, Weekday, SaturdayRule } from '../types';
import { resolveDaySchedule } from './timetable';

export interface UnmarkedCountParams {
  startDate: string;
  endDate: string;
  slots: TimetableSlot[];
  versions?: TimetableVersion[];
  overrides?: TimetableOverride[];
  calendarEvents?: CalendarEvent[];
  records: AttendanceRecord[];
  courses: { id: string; tracking_start_date?: string | null }[];
  workingDays?: Weekday[];
  saturdayRule?: SaturdayRule;
}

/**
 * Counts total unmarked scheduled periods across past dates from startDate to endDate inclusive.
 * Classes before a course's tracking_start_date are excluded.
 */
export function countUnmarkedClasses(params: UnmarkedCountParams): number {
  const {
    startDate,
    endDate,
    slots,
    versions = [],
    overrides = [],
    calendarEvents = [],
    records,
    courses,
    workingDays = [1, 2, 3, 4, 5, 6],
    saturdayRule,
  } = params;

  if (startDate > endDate) return 0;

  const courseMap = new Map(courses.map(c => [c.id, c]));
  const markedSet = new Set(
    records.filter(r => !r.deleted_at).map(r => `${r.course_id}:${r.date}:${r.slot_id || ''}`)
  );

  let totalUnmarked = 0;
  const current = new Date(startDate + 'T00:00:00Z');
  const end = new Date(endDate + 'T00:00:00Z');

  while (current <= end) {
    const dateStr = current.toISOString().slice(0, 10);
    const schedule = resolveDaySchedule({
      date: dateStr,
      versions,
      slots,
      calendarEvents,
      overrides,
      workingDays,
      saturdayRule,
    });

    if (!schedule.is_holiday && schedule.slots.length > 0) {
      for (const s of schedule.slots) {
        const course = courseMap.get(s.course_id);
        if (course?.tracking_start_date && dateStr < course.tracking_start_date) {
          continue;
        }
        const keyWithSlot = `${s.course_id}:${dateStr}:${s.slot_id || ''}`;
        const keyWithoutSlot = `${s.course_id}:${dateStr}:`;
        if (!markedSet.has(keyWithSlot) && !markedSet.has(keyWithoutSlot)) {
          totalUnmarked += s.weight;
        }
      }
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return totalUnmarked;
}

export interface AttendanceClearFilterOptions {
  courseId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/**
 * Pure evaluation function to determine if an attendance record matches the given clear filters.
 */
export function shouldClearAttendanceRecord(
  record: { course_id: string; date: string; deleted_at?: string | null },
  options: AttendanceClearFilterOptions = {}
): boolean {
  if (record.deleted_at !== null && record.deleted_at !== undefined) return false;
  if (options.courseId && record.course_id !== options.courseId) return false;
  if (options.startDate && record.date < options.startDate) return false;
  if (options.endDate && record.date > options.endDate) return false;
  return true;
}

