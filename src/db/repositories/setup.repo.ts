/**
 * Setup and Initialization Repository
 * Coordinates full setup initialization and demo seeding in Dexie.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import {
  Profile,
  Program,
  GradingScheme,
  Term,
  Course,
  CourseType,
  TimetableSlot,
  LabAttendanceRule,
} from '../../types';
import {
  profileSchema,
  programSchema,
  gradingSchemeSchema,
  termSchema,
  courseSchema,
  timetableSlotSchema,
  validateEntity,
} from '../schemas';
import { generateUUID } from '../../utils/uuid';
import { UGC_10_POINT_SCHEME } from '../../presets/grading-schemes';
import { setLabAttendanceRule } from '../../utils/preferences';

export interface OnboardingData {
  userName: string;
  degreeType: string;
  branchName: string;
  startYear: number;
  durationYears?: number;
  entryType: 'regular' | 'lateral';
  termNumber: number;
  termName: string;
  startDate: string;
  endDate: string;
  attendanceThreshold: number;
  labAttendanceRule?: LabAttendanceRule;
  courses: Array<{
    name: string;
    code: string;
    credits: number;
    type: CourseType;
    color: string;
  }>;
  slots?: Array<{
    courseIndex: number;
    weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    startTime: string;
    endTime: string;
  }>;
}

export async function isAppInitialized(): Promise<boolean> {
  const count = await db.profile.count();
  return count > 0;
}

export async function getActiveProfile(): Promise<Profile | undefined> {
  return db.profile.filter(p => p.deleted_at === null).first();
}

export async function getActiveTerm(): Promise<Term | undefined> {
  return db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first();
}

/**
 * Saves initial onboarding configuration atomically.
 */
export async function saveOnboardingSetup(data: OnboardingData, isDemo = false): Promise<void> {
  const now = new Date().toISOString();

  // 1. Create or use grading scheme
  const gradingSchemeId = generateUUID();
  const gradingScheme: GradingScheme = {
    id: gradingSchemeId,
    user_id: LOCAL_USER_ID,
    is_demo: isDemo,
    name: UGC_10_POINT_SCHEME.name,
    is_preset: true,
    scheme_data: UGC_10_POINT_SCHEME.data,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  validateEntity(gradingSchemeSchema, gradingScheme);

  // 2. Profile
  const profileId = generateUUID();
  const profile: Profile = {
    id: profileId,
    user_id: LOCAL_USER_ID,
    is_demo: isDemo,
    name: data.userName.trim() || 'Student',
    region: 'IN',
    theme: 'system',
    accent: 'indigo',
    default_attendance_threshold: data.attendanceThreshold,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  validateEntity(profileSchema, profile);

  // 3. Program
  const programId = generateUUID();
  const program: Program = {
    id: programId,
    user_id: LOCAL_USER_ID,
    is_demo: isDemo,
    degree_type: data.degreeType as any,
    branch_department: data.branchName.trim() || 'Engineering',
    start_year: data.startYear,
    duration_years: data.durationYears || 4,
    entry_type: data.entryType,
    term_system: 'semester',
    grading_scheme_id: gradingSchemeId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  validateEntity(programSchema, program);

  // 4. Term
  const termId = generateUUID();
  const defaultPeriodTimings = [
    { id: 'p1', name: 'Period 1', start_time: '09:00', end_time: '09:55', is_break: false },
    { id: 'p2', name: 'Period 2', start_time: '10:00', end_time: '10:55', is_break: false },
    { id: 'b1', name: 'Short Break', start_time: '10:55', end_time: '11:15', is_break: true },
    { id: 'p3', name: 'Period 3', start_time: '11:15', end_time: '12:10', is_break: false },
    { id: 'lunch', name: 'Lunch', start_time: '12:10', end_time: '13:00', is_break: true },
    { id: 'p4', name: 'Period 4 / Lab', start_time: '13:00', end_time: '15:00', is_break: false },
  ];

  const term: Term = {
    id: termId,
    user_id: LOCAL_USER_ID,
    program_id: programId,
    is_demo: isDemo,
    number: data.termNumber,
    name: data.termName,
    start_date: data.startDate,
    end_date: data.endDate,
    sgpa: null,
    status: 'ongoing',
    attendance_threshold: data.attendanceThreshold,
    working_days: [1, 2, 3, 4, 5, 6], // Monday to Saturday
    saturday_rule: 'second_saturday_off',
    period_timings: defaultPeriodTimings,
    lab_attendance_rule: data.labAttendanceRule || 'single_session',
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  validateEntity(termSchema, term);

  if (data.labAttendanceRule) {
    setLabAttendanceRule(data.labAttendanceRule);
  }

  // 4b. Initial Timetable Version
  const initialVersionId = generateUUID();
  await db.timetable_version.put({
    id: initialVersionId,
    user_id: LOCAL_USER_ID,
    term_id: termId,
    is_demo: isDemo,
    name: 'Initial Timetable',
    effective_from: data.startDate,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  });

  // 5. Courses
  const createdCourses: Course[] = [];
  for (const c of data.courses) {
    const course: Course = {
      id: generateUUID(),
      user_id: LOCAL_USER_ID,
      term_id: termId,
      is_demo: isDemo,
      name: c.name,
      code: c.code,
      credits: c.credits,
      type: c.type,
      counts_toward_gpa: c.type !== 'audit',
      attendance_threshold_override: null,
      color: c.color,
      medical_counts_as_present: false,
      duty_leave_counts_as_present: true,
      initial_attended: 0,
      initial_conducted: 0,
      tracking_start_date: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    validateEntity(courseSchema, course);
    createdCourses.push(course);
  }

  // 6. Timetable Slots
  const createdSlots: TimetableSlot[] = [];
  if (data.slots && data.slots.length > 0) {
    for (const s of data.slots) {
      if (s.courseIndex < createdCourses.length) {
        const targetCourse = createdCourses[s.courseIndex];
        const slot: TimetableSlot = {
          id: generateUUID(),
          user_id: LOCAL_USER_ID,
          course_id: targetCourse.id,
          version_id: initialVersionId,
          is_demo: isDemo,
          weekday: s.weekday,
          start_time: s.startTime,
          end_time: s.endTime,
          room: null,
          component_type: targetCourse.type,
          weight: targetCourse.type === 'lab' ? 2 : 1,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        };
        validateEntity(timetableSlotSchema, slot);
        createdSlots.push(slot);
      }
    }
  }

  // Save all entities in a single Dexie transaction
  await db.transaction('rw', [db.profile, db.grading_scheme, db.program, db.term, db.course, db.timetable_slot], async () => {
    await db.grading_scheme.put(gradingScheme);
    await db.profile.put(profile);
    await db.program.put(program);
    await db.term.put(term);
    await db.course.bulkPut(createdCourses);
    if (createdSlots.length > 0) {
      await db.timetable_slot.bulkPut(createdSlots);
    }
  });
}

/**
 * Creates a rich demo setup so the app is instantly usable for testing.
 * All demo records are marked with is_demo: true so they never mix silently with real data.
 */
export async function seedDemoData(): Promise<void> {
  const currentYear = new Date().getFullYear();
  const demoData: OnboardingData = {
    userName: 'Aarav Sharma',
    degreeType: 'BTech',
    branchName: 'Computer Science and Engineering',
    startYear: currentYear,
    entryType: 'regular',
    termNumber: 5,
    termName: 'Semester 5',
    startDate: `${currentYear}-08-01`,
    endDate: `${currentYear}-12-15`,
    attendanceThreshold: 75,
    courses: [
      { name: 'Operating Systems', code: 'CS501', credits: 4, type: 'theory', color: '#6366f1' },
      { name: 'Database Management Systems', code: 'CS502', credits: 4, type: 'theory', color: '#0ea5e9' },
      { name: 'Computer Networks', code: 'CS503', credits: 4, type: 'theory', color: '#10b981' },
      { name: 'DBMS Laboratory', code: 'CS504L', credits: 2, type: 'lab', color: '#f59e0b' },
      { name: 'Theory of Computation', code: 'CS505', credits: 3, type: 'theory', color: '#ec4899' },
    ],
    slots: [
      // Monday (1)
      { courseIndex: 0, weekday: 1, startTime: '09:00', endTime: '09:55' },
      { courseIndex: 1, weekday: 1, startTime: '10:00', endTime: '10:55' },
      { courseIndex: 2, weekday: 1, startTime: '11:15', endTime: '12:10' },
      // Tuesday (2)
      { courseIndex: 1, weekday: 2, startTime: '09:00', endTime: '09:55' },
      { courseIndex: 2, weekday: 2, startTime: '10:00', endTime: '10:55' },
      { courseIndex: 3, weekday: 2, startTime: '14:00', endTime: '16:00' }, // Lab
      // Wednesday (3)
      { courseIndex: 0, weekday: 3, startTime: '09:00', endTime: '09:55' },
      { courseIndex: 4, weekday: 3, startTime: '10:00', endTime: '10:55' },
      { courseIndex: 1, weekday: 3, startTime: '11:15', endTime: '12:10' },
      // Thursday (4)
      { courseIndex: 2, weekday: 4, startTime: '09:00', endTime: '09:55' },
      { courseIndex: 0, weekday: 4, startTime: '10:00', endTime: '10:55' },
      { courseIndex: 4, weekday: 4, startTime: '11:15', endTime: '12:10' },
      // Friday (5)
      { courseIndex: 4, weekday: 5, startTime: '09:00', endTime: '09:55' },
      { courseIndex: 0, weekday: 5, startTime: '10:00', endTime: '10:55' },
      { courseIndex: 1, weekday: 5, startTime: '11:15', endTime: '12:10' },
      // Saturday (6)
      { courseIndex: 2, weekday: 6, startTime: '09:00', endTime: '09:55' },
      // Sunday (0)
      { courseIndex: 0, weekday: 0, startTime: '10:00', endTime: '10:55' },
    ],
  };

  await saveOnboardingSetup(demoData, true);

  // Seed sample past attendance records marked as is_demo: true
  const courses = await db.course.filter(c => c.deleted_at === null && c.is_demo === true).toArray();
  const recordsToInsert: any[] = [];
  const now = new Date().toISOString();

  // Course 0 (Operating Systems): 18 attended out of 20 conducted (90%) -> 4 safe bunks
  if (courses[0]) {
    for (let i = 1; i <= 20; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      recordsToInsert.push({
        id: generateUUID(),
        user_id: LOCAL_USER_ID,
        is_demo: true,
        course_id: courses[0].id,
        date: `2026-09-${dayStr}`,
        slot_id: null,
        status: i <= 18 ? 'present' : 'absent',
        note: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }
  }

  // Course 1 (DBMS): 14 attended out of 20 conducted (70%) -> in danger, must attend 4
  if (courses[1]) {
    for (let i = 1; i <= 20; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      recordsToInsert.push({
        id: generateUUID(),
        user_id: LOCAL_USER_ID,
        is_demo: true,
        course_id: courses[1].id,
        date: `2026-09-${dayStr}`,
        slot_id: null,
        status: i <= 14 ? 'present' : 'absent',
        note: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }
  }

  // Course 2 (Networks): 15 attended out of 20 conducted (75%) -> borderline
  if (courses[2]) {
    for (let i = 1; i <= 20; i++) {
      const dayStr = i < 10 ? `0${i}` : `${i}`;
      recordsToInsert.push({
        id: generateUUID(),
        user_id: LOCAL_USER_ID,
        is_demo: true,
        course_id: courses[2].id,
        date: `2026-09-${dayStr}`,
        slot_id: null,
        status: i <= 15 ? 'present' : 'absent',
        note: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      });
    }
  }

  if (recordsToInsert.length > 0) {
    await db.attendance_record.bulkPut(recordsToInsert);
  }

  try {
    localStorage.setItem('spirit_demo_mode', 'true');
  } catch {
    // Ignore
  }
}

/**
 * Checks if demo data is currently loaded in the system.
 */
export async function hasDemoData(): Promise<boolean> {
  try {
    const demoCourses = await db.course.filter(c => c.is_demo === true && c.deleted_at === null).count();
    if (demoCourses > 0) return true;
    const profile = await db.profile.filter(p => p.is_demo === true && p.deleted_at === null).first();
    if (profile) return true;
    return localStorage.getItem('spirit_demo_mode') === 'true';
  } catch {
    return false;
  }
}

/**
 * Clears demo data without deleting any user-created real data.
 * If the profile itself is demo, resets the app entirely.
 */
export async function clearDemoData(): Promise<{ clearedCount: number; resetApp: boolean }> {
  const profile = await db.profile.filter(p => p.deleted_at === null).first();
  const isProfileDemo = profile?.is_demo === true;

  try {
    localStorage.removeItem('spirit_demo_mode');
  } catch {
    // Ignore
  }

  if (isProfileDemo) {
    await resetDatabase();
    return { clearedCount: 1, resetApp: true };
  }

  let clearedCount = 0;
  const tables = [
    db.course,
    db.attendance_record,
    db.timetable_slot,
    db.timetable_version,
    db.timetable_override,
    db.calendar_event,
    db.assessment_component,
    db.mark,
    db.grade_result,
    db.task,
  ];

  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      const demoItems = await table.filter(item => item.is_demo === true).toArray();
      clearedCount += demoItems.length;
      if (demoItems.length > 0) {
        await table.bulkDelete(demoItems.map(item => item.id));
      }
    }
  });

  return { clearedCount, resetApp: false };
}

/**
 * Resets all database tables.
 */
export async function resetDatabase(): Promise<void> {
  await Promise.all([
    db.profile.clear(),
    db.grading_scheme.clear(),
    db.program.clear(),
    db.term.clear(),
    db.course.clear(),
    db.timetable_version.clear(),
    db.timetable_slot.clear(),
    db.timetable_override.clear(),
    db.calendar_event.clear(),
    db.attendance_record.clear(),
    db.assessment_component.clear(),
    db.mark.clear(),
    db.grade_result.clear(),
    db.task.clear(),
  ]);

  try {
    localStorage.removeItem('spirit_demo_mode');
  } catch {
    // Ignore
  }
}

