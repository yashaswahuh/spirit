/**
 * Spirit: Attendance + Semester Dashboard
 * Core TypeScript Data Models and Calculation Engine Interfaces
 *
 * All entities adhere to the local-first and Supabase schema requirements:
 * id (UUID client-generated), user_id (UUID), created_at, updated_at, deleted_at (nullable).
 */

// ============================================================================
// BASE ENTITY
// ============================================================================

export interface BaseEntity {
  id: string; // Client-generated UUID (v4)
  user_id: string; // Supabase auth user UUID or local default user ID
  created_at: string; // ISO 8601 string
  updated_at: string; // ISO 8601 string
  deleted_at: string | null; // ISO 8601 string, null if active, set if soft-deleted
}

// ============================================================================
// ENUMS & LITERAL UNIONS
// ============================================================================

export type Region = 'IN' | 'OTHER';

export type ThemeMode = 'light' | 'dark' | 'system';

export type AccentColor =
  | 'indigo'
  | 'blue'
  | 'emerald'
  | 'violet'
  | 'rose'
  | 'amber'
  | 'cyan'
  | string;

export type DegreeType =
  | 'BTech'
  | 'BE'
  | 'MTech'
  | 'ME'
  | 'BSc'
  | 'MSc'
  | 'BA'
  | 'MA'
  | 'BCom'
  | 'MCom'
  | 'BBA'
  | 'MBA'
  | 'BCA'
  | 'MCA'
  | 'BArch'
  | 'BPharm'
  | 'LLB'
  | 'MBBS'
  | 'medical_other'
  | 'diploma'
  | 'integrated'
  | 'other_custom';

export type EntryType = 'regular' | 'lateral';

export type TermSystem = 'semester' | 'trimester' | 'annual';

export type GradingSchemeType =
  | 'point_scale'
  | 'percentage'
  | 'division'
  | 'pass_fail';

export type TermStatus = 'upcoming' | 'ongoing' | 'completed';

export type CourseType =
  | 'theory'
  | 'lab'
  | 'tutorial'
  | 'project'
  | 'elective'
  | 'audit';

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

export type CalendarEventType = 'holiday' | 'exam' | 'swap_day' | 'event';

export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'cancelled'
  | 'medical'
  | 'duty_leave'
  | 'holiday';

export type AssessmentRuleType = 'normal' | 'best_of_N' | 'drop_lowest';

export type TaskType = 'assignment' | 'exam' | 'other';

// ============================================================================
// 1. PROFILE
// ============================================================================

export interface Profile extends BaseEntity {
  name: string;
  region: Region; // default 'IN'
  theme: ThemeMode; // 'light' | 'dark' | 'system'
  accent: AccentColor; // Accent color name or hex
  default_attendance_threshold: number; // e.g., 75 (representing 75%)
}

// ============================================================================
// 2. PROGRAM
// ============================================================================

export interface Program extends BaseEntity {
  degree_type: DegreeType;
  branch_department: string; // e.g. "Computer Science & Engineering"
  start_year: number; // e.g. 2024
  duration_years: number; // e.g. 4 for BTech, 3 for lateral BTech, 5 for integrated
  entry_type: EntryType; // 'regular' or 'lateral' (starts at semester 3)
  term_system: TermSystem; // 'semester', 'trimester', 'annual'
  grading_scheme_id: string; // Foreign key to grading_scheme.id
}

// ============================================================================
// 3. GRADING SCHEME
// ============================================================================

export interface GradeScaleEntry {
  letter: string; // e.g. "O", "A+", "A", "B", "F"
  points: number; // e.g. 10, 9, 8, 7, 0
  min_percentage?: number; // Optional percentage floor (e.g. 90 for 'O')
  max_percentage?: number; // Optional percentage ceiling (e.g. 100)
  description?: string; // e.g. "Outstanding"
}

export interface CgpaToPercentageRule {
  rule_type: 'multiplier' | 'custom_formula';
  multiplier?: number; // e.g. 9.5 (CBSE/AICTE formula: CGPA * 9.5) or 10
  formula_expression?: string; // e.g. "((cgpa - 0.75) * 10)" (for VTU/others)
}

export interface RoundingRule {
  precision: number; // e.g. 2 decimal places
  mode: 'round' | 'floor' | 'ceil';
}

export interface DivisionThreshold {
  name: string; // e.g. "First Class with Distinction", "First Class", "Second Class", "Pass"
  min_percentage: number; // e.g. 75, 60, 50, 40
}

export interface GradingSchemeData {
  type: GradingSchemeType;
  scale: GradeScaleEntry[]; // letter -> points map
  pass_mark: number; // e.g. 40 or 50
  max_point: number; // e.g. 10 or 4
  cgpa_to_percentage: CgpaToPercentageRule;
  rounding: RoundingRule;
  division_thresholds?: DivisionThreshold[]; // For annual or division-based degrees
  notes?: string; // Preset approximation disclaimer
}

export interface GradingScheme extends BaseEntity {
  name: string; // e.g. "UGC 10-Point Scale", "AICTE Recommended", "Anna University 10-Point", "Custom"
  is_preset: boolean; // true if built-in approximation preset, false if custom
  scheme_data: GradingSchemeData; // Structured JSON configuration
}

// ============================================================================
// 4. TERM & PERIOD TIMING
// ============================================================================

export interface PeriodTiming {
  id: string;
  name: string; // e.g. "P1", "Break", "P2", "Lunch"
  start_time: string; // "09:00"
  end_time: string; // "09:55"
  is_break: boolean;
}

export interface Term extends BaseEntity {
  program_id: string; // Foreign key to program.id
  number: number; // e.g. 1, 2, 3...
  name: string; // e.g. "Semester 1", "Trimester 2", "1st Year"
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  sgpa: number | null; // Computed SGPA (null until grades entered)
  status: TermStatus; // 'upcoming' | 'ongoing' | 'completed'
  attendance_threshold?: number; // Target attendance threshold for the term (default 75)
  working_days?: Weekday[]; // Working days of week (default Mon-Sat: [1, 2, 3, 4, 5, 6])
  period_timings?: PeriodTiming[]; // Custom period timings
}

// ============================================================================
// 5. COURSE
// ============================================================================

export interface Course extends BaseEntity {
  term_id: string; // Foreign key to term.id
  name: string; // e.g. "Data Structures and Algorithms"
  code: string; // e.g. "CS201"
  credits: number; // e.g. 4
  type: CourseType; // 'theory' | 'lab' | 'tutorial' | 'project' | 'elective' | 'audit'
  counts_toward_gpa: boolean; // false for audit/non-credit courses
  attendance_threshold_override: number | null; // null uses profile/term default, number overrides (e.g. 85)
  color: string; // Hex color or palette key for badges/charts
  medical_counts_as_present: boolean; // Setting: whether medical leave is counted as present
  duty_leave_counts_as_present: boolean; // Setting: whether duty leave is counted as present
  initial_attended?: number; // Opening balance: attended classes before tracking started
  initial_conducted?: number; // Opening balance: conducted classes before tracking started
  tracking_start_date?: string | null; // Date tracking started (YYYY-MM-DD)
}

// ============================================================================
// 6. TIMETABLE VERSION & SLOTS
// ============================================================================

export interface TimetableVersion extends BaseEntity {
  term_id: string; // Foreign key to term.id
  name: string; // e.g. "Semester Start Timetable", "Revised Timetable"
  effective_from: string; // YYYY-MM-DD
}

export interface TimetableSlot extends BaseEntity {
  course_id: string; // Foreign key to course.id
  version_id?: string | null; // Foreign key to timetable_version.id
  weekday: Weekday; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  start_time: string; // HH:mm (24-hour format, e.g. "09:00")
  end_time: string; // HH:mm (24-hour format, e.g. "09:50")
  room: string | null; // e.g. "Hall 302", "Lab 3"
  faculty?: string | null; // Optional faculty/instructor name
  component_type: CourseType; // 'theory' | 'lab' | 'tutorial' | etc.
  weight?: number; // Period weight (default 1; e.g. 2 or 3 for 2-3 hour lab)
  period_name?: string | null; // Optional label like "Period 1"
}

// ============================================================================
// 6B. TIMETABLE ONE-OFF OVERRIDE (Specific Date Changes)
// ============================================================================

export type OneOffOverrideAction = 'cancel' | 'substitute' | 'extra' | 'reschedule';

export interface TimetableOverride extends BaseEntity {
  term_id: string;
  date: string; // YYYY-MM-DD
  action: OneOffOverrideAction;
  original_slot_id: string | null; // null if extra class
  course_id: string; // Course ID for the slot (substituted, extra, or original)
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  room: string | null;
  faculty: string | null;
  component_type: CourseType;
  weight: number; // default 1
  note: string | null;
}

// ============================================================================
// 7. CALENDAR EVENT
// ============================================================================

export interface CalendarEvent extends BaseEntity {
  date: string; // YYYY-MM-DD (start date)
  end_date?: string | null; // YYYY-MM-DD (optional end date for range holidays)
  type: CalendarEventType; // 'holiday' | 'exam' | 'swap_day' | 'event'
  swap_target_weekday: Weekday | null; // If swap_day, timetable day to follow (e.g. 1 for Monday timetable)
  note: string | null; // e.g. "Diwali Holiday", "Mid-term exam week", "Follow Monday timetable"
}

// ============================================================================
// 8. ATTENDANCE RECORD
// ============================================================================

export interface AttendanceRecord extends BaseEntity {
  course_id: string; // Foreign key to course.id
  date: string; // YYYY-MM-DD
  slot_id: string | null; // Foreign key to timetable_slot.id (nullable for unscheduled/extra classes)
  status: AttendanceStatus; // 'present' | 'absent' | 'cancelled' | 'medical' | 'duty_leave' | 'holiday'
  weight?: number; // Period weight for this session (default 1)
  override_id?: string | null; // Optional foreign key to timetable_override.id
  note: string | null; // e.g. "Proxy missed", "NSS Duty Leave", "Teacher absent"
}

// ============================================================================
// 9. ASSESSMENT COMPONENT
// ============================================================================

export interface AssessmentRuleParams {
  n?: number; // For best_of_N (e.g. best 2 of 3)
  count?: number; // Number of components in group
}

export interface AssessmentComponent extends BaseEntity {
  course_id: string; // Foreign key to course.id
  name: string; // e.g. "CAT1", "CAT2", "Mid-Sem", "Assignment 1", "End-Sem", "Lab Internal"
  max_marks: number; // e.g. 50, 100
  weightage: number; // Percentage contribution (e.g. 30 means 30% of final grade)
  rule: AssessmentRuleType; // 'normal' | 'best_of_N' | 'drop_lowest'
  rule_group: string | null; // Identifier connecting related components (e.g. "cat_group" for Best-of-2 CATs)
  rule_params: AssessmentRuleParams | null; // Configuration for the rule
  is_end_sem: boolean; // Flag to identify end-sem component for separate passing rules
  min_pass_marks: number | null; // Separate minimum pass marks required in this component if any
}

// ============================================================================
// 10. MARK
// ============================================================================

export interface Mark extends BaseEntity {
  component_id: string; // Foreign key to assessment_component.id
  obtained_marks: number; // e.g. 42.5
}

// ============================================================================
// 11. GRADE RESULT
// ============================================================================

export interface GradeResult extends BaseEntity {
  course_id: string; // Foreign key to course.id
  letter_grade: string | null; // e.g. "A+", "B", "RA" (Re-appear)
  grade_points: number | null; // e.g. 9.0
  attempt_number: number; // 1 for regular, 2+ for backlog/arrear/improvement/repeat
  is_passing: boolean; // true if passed, false if backlog/arrear
}

// ============================================================================
// 12. TASK
// ============================================================================

export interface Task extends BaseEntity {
  title: string; // e.g. "Submit DSA Assignment 2"
  type: TaskType; // 'assignment' | 'exam' | 'other'
  due_at: string | null; // ISO 8601 timestamp string
  course_id: string | null; // Foreign key to course.id (null for general tasks)
  done: boolean; // true if completed
}

// ============================================================================
// CALCULATION ENGINE DOMAIN TYPES (/src/engine)
// ============================================================================

export interface CourseAttendanceRules {
  medical_counts_as_present: boolean;
  duty_leave_counts_as_present: boolean;
}

export interface AttendanceStats {
  attended: number;
  conducted: number;
  percentage: number; // (attended / conducted) * 100
  threshold: number; // Target threshold e.g. 75
  safe_bunks: number; // Max classes student can safely miss: floor(attended / t - conducted), min 0
  must_attend: number; // Min classes student must attend consecutively: ceil((t * conducted - attended) / (1 - t)), min 0
  is_in_danger: boolean; // true if percentage < threshold
}

export interface AttendanceProjection {
  total_projected_classes: number; // conducted + remaining scheduled classes until term end
  best_case_percentage: number; // attend all remaining
  worst_case_percentage: number; // miss all remaining
  classes_needed_to_finish_at_threshold: number; // required attendance out of remaining to finish >= t
  can_meet_threshold: boolean; // true if even in best case threshold is achievable
}

export interface WhatIfDayInput {
  date: string;
  skip_all: boolean;
  skipped_course_ids?: string[]; // If skipping specific classes on this day
}

export interface WhatIfSubjectImpact {
  course_id: string;
  current_percentage: number;
  new_percentage: number;
  classes_skipped: number;
  remains_safe: boolean;
}

export interface CourseGradeCreditInput {
  credits: number;
  grade_points: number;
  counts_toward_gpa: boolean;
}

export interface SgpaResult {
  sgpa: number;
  total_credits: number;
  gpa_credits: number;
}

export interface TermGradeSummary {
  term_id: string;
  term_number: number;
  sgpa: number;
  credits: number;
}

export interface CgpaConfig {
  repeat_handling: 'replace_old' | 'keep_best';
  rounding: RoundingRule;
  cgpa_to_percentage: CgpaToPercentageRule;
}

export interface CgpaResult {
  cgpa: number;
  total_credits: number;
  percentage: number;
}

export interface EndSemRequiredMarksInput {
  internal_obtained: number;
  internal_max: number;
  internal_weightage: number; // e.g. 40%
  end_sem_max: number;
  end_sem_weightage: number; // e.g. 60%
  target_total_percentage: number; // e.g. 50% for pass, 75% for A grade
  end_sem_min_pass_marks?: number; // Minimum marks required in end-sem itself
}

export interface EndSemRequiredMarksResult {
  required_raw_marks: number;
  required_percentage: number;
  is_achievable: boolean;
  limiting_reason?: 'exceeds_max_marks' | 'below_min_end_sem_requirement';
}

// ============================================================================
// OFFLINE SYNC & DATABASE REGISTRY TYPES
// ============================================================================

export type TableName =
  | 'profile'
  | 'program'
  | 'grading_scheme'
  | 'term'
  | 'course'
  | 'timetable_version'
  | 'timetable_slot'
  | 'timetable_override'
  | 'calendar_event'
  | 'attendance_record'
  | 'assessment_component'
  | 'mark'
  | 'grade_result'
  | 'task';

export interface SyncQueueItem {
  id: string; // Sync queue record UUID
  table_name: TableName;
  row_id: string; // The record's UUID
  action: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  timestamp: string;
  retry_count: number;
  error?: string;
}

export interface SyncState {
  last_synced_at: string | null;
  pending_count: number;
  is_syncing: boolean;
  last_error: string | null;
}
