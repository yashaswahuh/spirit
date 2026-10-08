/**
 * Zod Validation Schemas for Spirit Data Models
 * Enforces data integrity before writes to Dexie and upon data import.
 */

import { z } from 'zod';

export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().min(1).optional().default('00000000-0000-0000-0000-000000000001'),
  is_demo: z.boolean().default(false).optional(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
  deleted_at: z.string().datetime({ offset: true }).nullable(),
});

export const profileSchema = baseEntitySchema.extend({
  name: z.string(),
  region: z.enum(['IN', 'OTHER']).default('IN'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  accent: z.string().default('indigo'),
  default_attendance_threshold: z.number().min(0).max(100).default(75),
});

export const gradeScaleEntrySchema = z.object({
  letter: z.string().min(1),
  points: z.number().min(0),
  min_percentage: z.number().min(0).max(100).optional(),
  max_percentage: z.number().min(0).max(100).optional(),
  description: z.string().optional(),
});

export const cgpaToPercentageRuleSchema = z.object({
  rule_type: z.enum(['multiplier', 'custom_formula']),
  multiplier: z.number().positive().optional(),
  formula_expression: z.string().optional(),
});

export const roundingRuleSchema = z.object({
  precision: z.number().int().min(0).max(4),
  mode: z.enum(['round', 'floor', 'ceil']),
});

export const divisionThresholdSchema = z.object({
  name: z.string().min(1),
  min_percentage: z.number().min(0).max(100),
});

export const gradingSchemeDataSchema = z.object({
  type: z.enum(['point_scale', 'percentage', 'division', 'pass_fail']),
  scale: z.array(gradeScaleEntrySchema),
  pass_mark: z.number().min(0),
  max_point: z.number().positive(),
  cgpa_to_percentage: cgpaToPercentageRuleSchema,
  rounding: roundingRuleSchema,
  division_thresholds: z.array(divisionThresholdSchema).optional(),
  repeat_handling: z.enum(['replace_old', 'keep_best']).default('replace_old').optional(),
  notes: z.string().optional(),
});

export const gradingSchemeSchema = baseEntitySchema.extend({
  name: z.string().min(1),
  is_preset: z.boolean().default(false),
  scheme_data: gradingSchemeDataSchema,
});

export const programSchema = baseEntitySchema.extend({
  degree_type: z.string().min(1),
  branch_department: z.string().min(1),
  start_year: z.number().int().min(1950).max(2100),
  duration_years: z.number().int().min(1).max(10),
  entry_type: z.enum(['regular', 'lateral']).default('regular'),
  term_system: z.enum(['semester', 'trimester', 'annual']).default('semester'),
  grading_scheme_id: z.string().uuid(),
});

export const periodTimingSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  start_time: z.string(),
  end_time: z.string(),
  is_break: z.boolean().default(false),
});

export const termSchema = baseEntitySchema.extend({
  program_id: z.string().uuid(),
  number: z.number().int().min(1),
  name: z.string().min(1),
  start_date: z.string(),
  end_date: z.string(),
  sgpa: z.number().nullable().optional(),
  status: z.enum(['upcoming', 'ongoing', 'completed']).default('ongoing'),
  attendance_threshold: z.number().min(0).max(100).default(75).optional(),
  working_days: z.array(z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ])).optional(),
  period_timings: z.array(periodTimingSchema).optional(),
  lab_attendance_rule: z.enum(['per_hour', 'single_session']).optional(),
});

export const courseSchema = baseEntitySchema.extend({
  term_id: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().default(''),
  credits: z.number().min(0).default(3),
  type: z.enum(['theory', 'lab', 'theory_and_lab', 'tutorial', 'project', 'elective', 'audit']).default('theory'),
  counts_toward_gpa: z.boolean().default(true),
  attendance_threshold_override: z.number().min(0).max(100).nullable().optional(),
  color: z.string().default('#4f46e5'),
  medical_counts_as_present: z.boolean().default(false),
  duty_leave_counts_as_present: z.boolean().default(true),
  initial_attended: z.number().min(0).default(0).optional(),
  initial_conducted: z.number().min(0).default(0).optional(),
  tracking_start_date: z.string().nullable().optional(),
  min_internal_marks: z.number().min(0).nullable().optional(),
  min_end_sem_marks: z.number().min(0).nullable().optional(),
  pass_marks: z.number().min(0).nullable().optional(),
  grade_band_override: z.array(gradeScaleEntrySchema).nullable().optional(),
  faculty: z.string().nullable().optional(),
  lab_attendance_rule: z.enum(['per_hour', 'single_session']).nullable().optional(),
});

export const timetableVersionSchema = baseEntitySchema.extend({
  term_id: z.string().uuid(),
  name: z.string().min(1),
  effective_from: z.string(),
});

export const timetableSlotSchema = baseEntitySchema.extend({
  course_id: z.string().uuid(),
  version_id: z.string().uuid().nullable().optional(),
  weekday: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  component_type: z.enum(['theory', 'lab', 'theory_and_lab', 'tutorial', 'project', 'elective', 'audit']).default('theory'),
  weight: z.number().int().min(1).default(1).optional(),
  attendance_weight: z.number().int().min(1).nullable().optional(),
  period_name: z.string().nullable().optional(),
});

export const timetableOverrideSchema = baseEntitySchema.extend({
  term_id: z.string().uuid(),
  date: z.string(),
  action: z.enum(['cancel', 'substitute', 'extra', 'reschedule']),
  original_slot_id: z.string().uuid().nullable().optional(),
  course_id: z.string().uuid(),
  start_time: z.string(),
  end_time: z.string(),
  room: z.string().nullable().optional(),
  faculty: z.string().nullable().optional(),
  component_type: z.enum(['theory', 'lab', 'theory_and_lab', 'tutorial', 'project', 'elective', 'audit']).default('theory'),
  weight: z.number().int().min(1).default(1),
  note: z.string().nullable().optional(),
});

export const calendarEventSchema = baseEntitySchema.extend({
  date: z.string(),
  end_date: z.string().nullable().optional(),
  type: z.enum(['holiday', 'exam', 'swap_day', 'event']),
  swap_target_weekday: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.null(),
  ]).optional(),
  note: z.string().nullable().optional(),
});

export const attendanceRecordSchema = baseEntitySchema.extend({
  course_id: z.string(),
  date: z.string(),
  slot_id: z.string().nullable().optional(),
  status: z.enum(['present', 'absent', 'cancelled', 'medical', 'duty_leave', 'holiday']),
  weight: z.number().int().min(1).default(1).optional(),
  override_id: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  component_type: z.enum(['theory', 'lab', 'theory_and_lab', 'tutorial', 'project', 'elective', 'audit']).nullable().optional(),
});

export const assessmentComponentSchema = baseEntitySchema.extend({
  course_id: z.string().uuid(),
  name: z.string().min(1),
  max_marks: z.number().positive(),
  weightage: z.number().min(0),
  rule: z.enum(['normal', 'best_of_N', 'drop_lowest']).default('normal'),
  rule_group: z.string().nullable().optional(),
  rule_params: z.object({
    n: z.number().int().positive().optional(),
    count: z.number().int().positive().optional(),
  }).nullable().optional(),
  is_end_sem: z.boolean().default(false),
  min_pass_marks: z.number().min(0).nullable().optional(),
});

export const markSchema = baseEntitySchema.extend({
  component_id: z.string().uuid(),
  obtained_marks: z.number().min(0).nullable().optional(),
  status: z.enum(['entered', 'absent', 'not_held']).default('entered').optional(),
});

export const gradeResultSchema = baseEntitySchema.extend({
  course_id: z.string().uuid(),
  term_id: z.string().uuid().nullable().optional(),
  letter_grade: z.string().nullable().optional(),
  grade_points: z.number().nullable().optional(),
  attempt_number: z.number().int().min(1).default(1),
  is_passing: z.boolean().default(true),
});

export const taskSchema = baseEntitySchema.extend({
  title: z.string().min(1),
  type: z.enum(['assignment', 'quiz', 'mid_sem', 'end_sem', 'exam', 'project', 'other']).default('other'),
  due_at: z.string().nullable().optional(),
  course_id: z.string().uuid().nullable().optional(),
  done: z.boolean().default(false),
  syllabus: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  venue: z.string().nullable().optional(),
});

export const backupPayloadSchema = z.object({
  app: z.literal('spirit', {
    message: 'Invalid backup file: not a Spirit application backup.',
  }),
  version: z.number().int().positive(),
  exported_at: z.string(),
  data: z.object({
    profile: z.array(profileSchema).default([]),
    program: z.array(programSchema).default([]),
    grading_scheme: z.array(gradingSchemeSchema).default([]),
    term: z.array(termSchema).default([]),
    course: z.array(courseSchema).default([]),
    timetable_version: z.array(timetableVersionSchema).default([]),
    timetable_slot: z.array(timetableSlotSchema).default([]),
    timetable_override: z.array(timetableOverrideSchema).default([]),
    calendar_event: z.array(calendarEventSchema).default([]),
    attendance_record: z.array(attendanceRecordSchema).default([]),
    assessment_component: z.array(assessmentComponentSchema).default([]),
    mark: z.array(markSchema).default([]),
    grade_result: z.array(gradeResultSchema).default([]),
    task: z.array(taskSchema).default([]),
  }),
});

export type BackupPayload = z.infer<typeof backupPayloadSchema>;

/**
 * Validates entity with Zod schema. Throws error if validation fails.
 */
export function validateEntity<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}
