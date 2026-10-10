/**
 * Spirit Term Repository Layer
 * Manages semesters/trimesters, active term switching, locking/finishing terms,
 * and the Next Semester Wizard (course copying and setup).
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { Term, Course, TimetableVersion } from '../../types';
import { calculateSgpa } from '../../engine/gpa';
import { reconcileSaturdayAttendanceRecords } from './attendance.repo';

export async function listTerms(): Promise<Term[]> {
  return db.term.filter(t => t.deleted_at === null).sortBy('number');
}

export async function createTerm(
  data: Omit<Term, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<Term> {
  const now = new Date().toISOString();
  const term: Term = {
    saturday_rule: 'second_saturday_off',
    ...data,
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.term.add(term);
  return term;
}

export async function updateTerm(
  id: string,
  data: Partial<Omit<Term, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  await db.term.update(id, {
    ...data,
    updated_at: new Date().toISOString(),
  });
  if (data.saturday_rule !== undefined) {
    await reconcileSaturdayAttendanceRecords(id).catch(() => {});
  }
}

export const updateTermSettings = updateTerm;

/**
 * Sets a specific term as the active ongoing term, marking other ongoing terms as completed.
 */
export async function setActiveTerm(termId: string): Promise<void> {
  const now = new Date().toISOString();
  const terms = await db.term.filter(t => t.deleted_at === null).toArray();

  for (const t of terms) {
    if (t.id === termId) {
      await db.term.update(t.id, { status: 'ongoing', updated_at: now });
    } else if (t.status === 'ongoing') {
      await db.term.update(t.id, { status: 'completed', updated_at: now });
    }
  }
}

/**
 * Locks and finishes a term: computes final SGPA from recorded course grades and freezes status.
 */
export async function lockTerm(termId: string): Promise<number | null> {
  const now = new Date().toISOString();
  const termCourses = await db.course.where('term_id').equals(termId).filter(c => c.deleted_at === null).toArray();
  const allResults = await db.grade_result.filter(g => g.deleted_at === null).toArray();

  const inputs = termCourses.map(c => {
    const results = allResults.filter(g => g.course_id === c.id);
    const latest = results.sort((a, b) => b.attempt_number - a.attempt_number)[0];
    return {
      credits: c.credits,
      grade_points: latest?.grade_points ?? null,
      counts_toward_gpa: c.counts_toward_gpa,
      letter_grade: latest?.letter_grade ?? null,
      is_audit: !c.counts_toward_gpa,
    };
  });

  const sgpaRes = calculateSgpa(inputs);
  const finalSgpa = sgpaRes.gpa_credits > 0 ? sgpaRes.sgpa : null;

  await db.term.update(termId, {
    status: 'completed',
    sgpa: finalSgpa,
    updated_at: now,
  });

  return finalSgpa;
}

export interface NextSemesterWizardOptions {
  currentTermId: string;
  name: string;
  start_date: string;
  end_date: string;
  attendance_threshold?: number;
  copy_courses?: boolean;
}

/**
 * Starts the next semester: locks the current term, creates the new term,
 * and optionally copies courses into the new term.
 */
export async function startNextSemester(
  options: NextSemesterWizardOptions
): Promise<Term> {
  const now = new Date().toISOString();
  const currentTerm = await db.term.get(options.currentTermId);

  // 1. Lock current term
  if (currentTerm) {
    await lockTerm(options.currentTermId);
  }

  const nextNumber = currentTerm ? currentTerm.number + 1 : 2;
  const programId = currentTerm?.program_id || crypto.randomUUID();

  // 2. Create new term
  const newTerm: Term = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    program_id: programId,
    number: nextNumber,
    name: options.name || `Semester ${nextNumber}`,
    start_date: options.start_date,
    end_date: options.end_date,
    sgpa: null,
    status: 'ongoing',
    attendance_threshold: options.attendance_threshold || currentTerm?.attendance_threshold || 75,
    working_days: currentTerm?.working_days || [1, 2, 3, 4, 5, 6],
    period_timings: currentTerm?.period_timings,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.term.add(newTerm);

  // 3. Optionally copy courses into the new semester
  if (options.copy_courses && currentTerm) {
    const oldCourses = await db.course
      .where('term_id')
      .equals(currentTerm.id)
      .filter(c => c.deleted_at === null)
      .toArray();

    for (const old of oldCourses) {
      const newCourse: Course = {
        ...old,
        id: crypto.randomUUID(),
        term_id: newTerm.id,
        initial_attended: 0,
        initial_conducted: 0,
        tracking_start_date: options.start_date,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      };
      await db.course.add(newCourse);
    }
  }

  // 4. Create initial timetable version for new term
  const newVersion: TimetableVersion = {
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    term_id: newTerm.id,
    name: 'Default Schedule',
    effective_from: options.start_date,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
  await db.timetable_version.add(newVersion);

  return newTerm;
}
