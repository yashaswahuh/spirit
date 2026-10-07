/**
 * Spirit Local-First Database Layer with Dexie.js (IndexedDB)
 * Works 100% offline with zero login required.
 */

import Dexie, { Table } from 'dexie';
import {
  Profile,
  Program,
  GradingScheme,
  Term,
  Course,
  TimetableVersion,
  TimetableSlot,
  TimetableOverride,
  CalendarEvent,
  AttendanceRecord,
  AssessmentComponent,
  Mark,
  GradeResult,
  Task,
} from '../types';

export const LOCAL_USER_ID = '00000000-0000-0000-0000-000000000001';

export class SpiritDatabase extends Dexie {
  profile!: Table<Profile, string>;
  grading_scheme!: Table<GradingScheme, string>;
  program!: Table<Program, string>;
  term!: Table<Term, string>;
  course!: Table<Course, string>;
  timetable_version!: Table<TimetableVersion, string>;
  timetable_slot!: Table<TimetableSlot, string>;
  timetable_override!: Table<TimetableOverride, string>;
  calendar_event!: Table<CalendarEvent, string>;
  attendance_record!: Table<AttendanceRecord, string>;
  assessment_component!: Table<AssessmentComponent, string>;
  mark!: Table<Mark, string>;
  grade_result!: Table<GradeResult, string>;
  task!: Table<Task, string>;

  constructor() {
    super('spirit_db');

    this.version(1).stores({
      profile: '&id, user_id, updated_at, deleted_at',
      grading_scheme: '&id, user_id, updated_at, deleted_at',
      program: '&id, user_id, grading_scheme_id, updated_at, deleted_at',
      term: '&id, user_id, program_id, status, updated_at, deleted_at',
      course: '&id, user_id, term_id, updated_at, deleted_at',
      timetable_slot: '&id, user_id, course_id, weekday, updated_at, deleted_at',
      calendar_event: '&id, user_id, date, updated_at, deleted_at',
      attendance_record: '&id, user_id, course_id, date, slot_id, [course_id+date], updated_at, deleted_at',
      assessment_component: '&id, user_id, course_id, updated_at, deleted_at',
      mark: '&id, user_id, component_id, updated_at, deleted_at',
      grade_result: '&id, user_id, course_id, updated_at, deleted_at',
      task: '&id, user_id, course_id, due_at, done, updated_at, deleted_at',
    });

    this.version(2).stores({
      profile: '&id, user_id, updated_at, deleted_at',
      grading_scheme: '&id, user_id, updated_at, deleted_at',
      program: '&id, user_id, grading_scheme_id, updated_at, deleted_at',
      term: '&id, user_id, program_id, status, updated_at, deleted_at',
      course: '&id, user_id, term_id, updated_at, deleted_at',
      timetable_version: '&id, user_id, term_id, effective_from, updated_at, deleted_at',
      timetable_slot: '&id, user_id, version_id, course_id, weekday, updated_at, deleted_at',
      timetable_override: '&id, user_id, term_id, date, course_id, updated_at, deleted_at',
      calendar_event: '&id, user_id, date, updated_at, deleted_at',
      attendance_record: '&id, user_id, course_id, date, slot_id, [course_id+date], updated_at, deleted_at',
      assessment_component: '&id, user_id, course_id, updated_at, deleted_at',
      mark: '&id, user_id, component_id, updated_at, deleted_at',
      grade_result: '&id, user_id, course_id, updated_at, deleted_at',
      task: '&id, user_id, course_id, due_at, done, updated_at, deleted_at',
    });
  }
}

export const db = new SpiritDatabase();
