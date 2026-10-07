/**
 * Course Repository
 * Handles type-safe, validated CRUD operations for courses.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { Course } from '../../types';
import { courseSchema, validateEntity } from '../schemas';
import { generateUUID } from '../../utils/uuid';

export async function getActiveCourses(termId?: string): Promise<Course[]> {
  let collection = db.course.filter(c => c.deleted_at === null);
  if (termId) {
    collection = collection.filter(c => c.term_id === termId);
  }
  return collection.toArray();
}

export async function getCourseById(id: string): Promise<Course | undefined> {
  const course = await db.course.get(id);
  return course && !course.deleted_at ? course : undefined;
}

export async function createCourse(data: Omit<Course, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Course> {
  const now = new Date().toISOString();
  const cleanFaculty = data.faculty ? data.faculty.trim() || null : null;
  const newCourse: Course = {
    ...data,
    faculty: cleanFaculty,
    id: generateUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  validateEntity(courseSchema, newCourse);
  await db.course.put(newCourse);
  return newCourse;
}

export async function updateCourse(id: string, updates: Partial<Course>): Promise<Course> {
  const existing = await db.course.get(id);
  if (!existing || existing.deleted_at) {
    throw new Error(`Course with id ${id} not found`);
  }

  const cleanFaculty = updates.faculty !== undefined
    ? (updates.faculty ? updates.faculty.trim() || null : null)
    : existing.faculty;

  const updated: Course = {
    ...existing,
    ...updates,
    faculty: cleanFaculty,
    id: existing.id,
    user_id: existing.user_id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  validateEntity(courseSchema, updated);
  await db.course.put(updated);

  // If faculty is explicitly modified, sync across all timetable slots for this course
  if (updates.faculty !== undefined) {
    await updateCourseFaculty(id, cleanFaculty);
  }

  return updated;
}

export async function deleteCourse(id: string): Promise<void> {
  const existing = await db.course.get(id);
  if (existing) {
    await db.course.update(id, {
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

/**
 * Updates the faculty name for a course and synchronizes it across all existing timetable slots for this course.
 */
export async function updateCourseFaculty(courseId: string, faculty?: string | null): Promise<void> {
  const cleanFaculty = faculty ? faculty.trim() || null : null;
  const course = await db.course.get(courseId);
  if (course && !course.deleted_at) {
    if (course.faculty !== cleanFaculty) {
      await db.course.update(courseId, {
        faculty: cleanFaculty,
        updated_at: new Date().toISOString(),
      });
    }
  }

  // Synchronize faculty across all existing slots for this course so other days reflect the name immediately
  const slots = await db.timetable_slot
    .where('course_id')
    .equals(courseId)
    .filter(s => s.deleted_at === null)
    .toArray();

  const now = new Date().toISOString();
  for (const slot of slots) {
    if (slot.faculty !== cleanFaculty) {
      await db.timetable_slot.update(slot.id, {
        faculty: cleanFaculty,
        updated_at: now,
      });
    }
  }
}
