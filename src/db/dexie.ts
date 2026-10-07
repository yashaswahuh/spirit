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
    }).upgrade(async tx => {
      // Data preservation and default backfills for version 1 records
      await tx.table('timetable_slot').toCollection().modify((slot: any) => {
        if (slot.weight === undefined) slot.weight = 1;
        if (slot.version_id === undefined) slot.version_id = null;
        if (slot.period_name === undefined) slot.period_name = null;
      });
      await tx.table('course').toCollection().modify((course: any) => {
        if (course.initial_attended === undefined) course.initial_attended = 0;
        if (course.initial_conducted === undefined) course.initial_conducted = 0;
        if (course.tracking_start_date === undefined) course.tracking_start_date = null;
      });
      await tx.table('attendance_record').toCollection().modify((record: any) => {
        if (record.weight === undefined) record.weight = 1;
        if (record.override_id === undefined) record.override_id = null;
      });
      await tx.table('calendar_event').toCollection().modify((event: any) => {
        if (event.end_date === undefined) event.end_date = null;
        if (event.swap_target_weekday === undefined) event.swap_target_weekday = null;
      });
      await tx.table('term').toCollection().modify((term: any) => {
        if (term.working_days === undefined) term.working_days = [1, 2, 3, 4, 5, 6];
        if (term.period_timings === undefined) term.period_timings = [];
      });
    });
  }
}

export const db = new SpiritDatabase();
