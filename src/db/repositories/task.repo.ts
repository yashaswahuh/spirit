/**
 * Spirit Tasks & Exams Repository Layer
 * Manages assignments, quizzes, mid-sems, end-sems, projects, and deadlines.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { Task, CalendarEvent } from '../../types';

export async function listTasks(): Promise<Task[]> {
  return db.task.filter(t => t.deleted_at === null).toArray();
}

export async function createTask(
  data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<Task> {
  const now = new Date().toISOString();
  const task: Task = {
    ...data,
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.task.add(task);

  // If task is an exam with a due date, also add a corresponding calendar event for the timetable/calendar view
  if ((task.type === 'exam' || task.type === 'mid_sem' || task.type === 'end_sem') && task.due_at) {
    const examDate = task.due_at.slice(0, 10);
    const event: CalendarEvent = {
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      date: examDate,
      end_date: null,
      type: 'exam',
      swap_target_weekday: null,
      note: `${task.title}${task.venue ? ` (${task.venue})` : ''}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.calendar_event.add(event);
  }

  return task;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  await db.task.update(id, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  await db.task.update(id, {
    done,
    updated_at: new Date().toISOString(),
  });
}

export async function deleteTask(id: string): Promise<void> {
  await db.task.update(id, {
    deleted_at: new Date().toISOString(),
  });
}
