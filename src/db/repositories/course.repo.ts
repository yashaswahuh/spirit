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
  const newCourse: Course = {
    ...data,
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

  const updated: Course = {
    ...existing,
    ...updates,
    id: existing.id,
    user_id: existing.user_id,
    created_at: existing.created_at,
    updated_at: new Date().toISOString(),
  };

  validateEntity(courseSchema, updated);
  await db.course.put(updated);
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
