/**
 * Pure TypeScript Attendance Calculation Engine
 * Zero React dependencies.
 */

import { AttendanceRecord, CourseAttendanceRules, AttendanceStats } from '../types';

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

/**
 * Computes comprehensive attendance stats for a course given its historical records.
 * Follows rules:
 * - 'cancelled' and 'holiday' are excluded from conducted count.
 * - 'medical' counts as present if rules.medical_counts_as_present is true.
 * - 'duty_leave' counts as present if rules.duty_leave_counts_as_present is true.
 */
export function computeCourseAttendanceStats(
  records: AttendanceRecord[],
  rules: CourseAttendanceRules,
  threshold: number
): AttendanceStats {
  let attended = 0;
  let conducted = 0;

  for (const record of records) {
    if (record.deleted_at) continue;

    switch (record.status) {
      case 'present':
        conducted += 1;
        attended += 1;
        break;
      case 'absent':
        conducted += 1;
        break;
      case 'medical':
        conducted += 1;
        if (rules.medical_counts_as_present) {
          attended += 1;
        }
        break;
      case 'duty_leave':
        conducted += 1;
        if (rules.duty_leave_counts_as_present) {
          attended += 1;
        }
        break;
      case 'cancelled':
      case 'holiday':
        // Cancelled and holidays are excluded from conducted
        break;
    }
  }

  const percentage = calculateAttendancePercentage(attended, conducted);
  const normThreshold = normalizeThreshold(threshold) * 100;
  const safe_bunks = calculateSafeBunks(attended, conducted, threshold);
  const must_attend = calculateMustAttend(attended, conducted, threshold);

  return {
    attended,
    conducted,
    percentage,
    threshold: normThreshold,
    safe_bunks,
    must_attend,
    is_in_danger: conducted > 0 && percentage < normThreshold,
  };
}

