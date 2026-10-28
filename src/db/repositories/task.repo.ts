/**
 * Spirit Tasks & Exams Repository Layer
 * Manages assignments, quizzes, mid-sems, end-sems, projects, and deadlines.
 * Automatically synchronizes exams with the college calendar and timetable view.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import { Task, CalendarEvent, ExamClassMode } from '../../types';
import { isExamType } from '../../engine/tasks';
import { scheduleTaskReminder, cancelTaskReminder } from '../../utils/notifications';

export async function listTasks(): Promise<Task[]> {
  return db.task.filter(t => t.deleted_at === null).toArray();
}

export async function getTask(id: string): Promise<Task | undefined> {
  const task = await db.task.get(id);
  if (!task || task.deleted_at !== null) return undefined;
  return task;
}

export async function createTask(
  data: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<Task> {
  const now = new Date().toISOString();
  const taskId = crypto.randomUUID();

  // Normalize empty strings
  const cleanedCourseId = data.course_id && data.course_id.trim() ? data.course_id.trim() : null;
  const cleanedTitle = data.title.trim();
  const cleanedVenue = data.venue ? data.venue.trim() || null : null;
  const cleanedSyllabus = data.syllabus ? data.syllabus.trim() || null : null;
  const cleanedNotes = data.notes ? data.notes.trim() || null : null;
  const cleanedSeatNumber = data.seat_number ? data.seat_number.trim() || null : null;

  let calendarEventId: string | null = null;

  // If task is an exam with a due date, create a linked calendar event for the timetable/calendar view
  if (isExamType(data.type) && data.due_at) {
    const examDate = data.due_at.slice(0, 10);
    calendarEventId = crypto.randomUUID();
    const event: CalendarEvent = {
      id: calendarEventId,
      user_id: LOCAL_USER_ID,
      date: examDate,
      end_date: null,
      type: 'exam',
      swap_target_weekday: null,
      note: `${cleanedTitle}${cleanedVenue ? ` (${cleanedVenue})` : ''}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.calendar_event.add(event);
  }

  const isExam = isExamType(data.type);
  const task: Task = {
    ...data,
    id: taskId,
    user_id: LOCAL_USER_ID,
    title: cleanedTitle,
    course_id: cleanedCourseId,
    venue: cleanedVenue,
    syllabus: cleanedSyllabus,
    notes: cleanedNotes,
    seat_number: cleanedSeatNumber,
    end_time: data.end_time || null,
    exam_class_mode: isExam ? (data.exam_class_mode || 'cancel_overlapping') : null,
    calendar_event_id: calendarEventId,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.task.add(task);

  // Schedule native reminder if configured
  if (task.reminder_offset && task.due_at && !task.done) {
    let courseName: string | undefined;
    if (task.course_id) {
      const course = await db.course.get(task.course_id);
      courseName = course?.code || course?.name;
    }
    await scheduleTaskReminder({
      id: task.id,
      title: task.title,
      type: task.type,
      due_at: task.due_at,
      venue: task.venue,
      reminder_offset: task.reminder_offset,
      course_name: courseName,
    });
  }

  return task;
}

export async function updateTask(
  id: string,
  data: Partial<Omit<Task, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  const existing = await db.task.get(id);
  if (!existing) return;

  const now = new Date().toISOString();

  // Normalize data
  const merged: Task = {
    ...existing,
    ...data,
    updated_at: now,
  };

  if (data.title !== undefined) merged.title = data.title.trim();
  if (data.course_id !== undefined) {
    merged.course_id = data.course_id && data.course_id.trim() ? data.course_id.trim() : null;
  }
  if (data.venue !== undefined) {
    merged.venue = data.venue ? data.venue.trim() || null : null;
  }
  if (data.syllabus !== undefined) {
    merged.syllabus = data.syllabus ? data.syllabus.trim() || null : null;
  }
  if (data.notes !== undefined) {
    merged.notes = data.notes ? data.notes.trim() || null : null;
  }
  if (data.seat_number !== undefined) {
    merged.seat_number = data.seat_number ? data.seat_number.trim() || null : null;
  }
  if (data.end_time !== undefined) {
    merged.end_time = data.end_time ? data.end_time.trim() || null : null;
  }
  if (data.exam_class_mode !== undefined) {
    merged.exam_class_mode = data.exam_class_mode;
  }

  // Synchronize linked calendar event
  const isExam = isExamType(merged.type);

  if (merged.calendar_event_id) {
    if (isExam && merged.due_at && !merged.done) {
      // Update existing calendar event
      await db.calendar_event.update(merged.calendar_event_id, {
        date: merged.due_at.slice(0, 10),
        note: `${merged.title}${merged.venue ? ` (${merged.venue})` : ''}`,
        updated_at: now,
        deleted_at: null,
      });
    } else {
      // If task is no longer an exam or due date removed or task completed, soft-delete calendar event
      await db.calendar_event.update(merged.calendar_event_id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  } else if (isExam && merged.due_at && !merged.done) {
    // Was not an exam previously or legacy task without calendar_event_id, create new calendar event
    const eventId = crypto.randomUUID();
    const event: CalendarEvent = {
      id: eventId,
      user_id: LOCAL_USER_ID,
      date: merged.due_at.slice(0, 10),
      end_date: null,
      type: 'exam',
      swap_target_weekday: null,
      note: `${merged.title}${merged.venue ? ` (${merged.venue})` : ''}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.calendar_event.add(event);
    merged.calendar_event_id = eventId;
  }

  await db.task.put(merged);

  // Update notification schedule
  if (merged.done || !merged.reminder_offset || !merged.due_at) {
    await cancelTaskReminder(merged.id);
  } else {
    let courseName: string | undefined;
    if (merged.course_id) {
      const course = await db.course.get(merged.course_id);
      courseName = course?.code || course?.name;
    }
    await scheduleTaskReminder({
      id: merged.id,
      title: merged.title,
      type: merged.type,
      due_at: merged.due_at,
      venue: merged.venue,
      reminder_offset: merged.reminder_offset,
      course_name: courseName,
    });
  }
}

export async function toggleTaskDone(id: string, done: boolean): Promise<void> {
  const task = await db.task.get(id);
  if (!task) return;

  const now = new Date().toISOString();

  await db.task.update(id, {
    done,
    updated_at: now,
  });

  if (done) {
    await cancelTaskReminder(id);
  } else if (task.reminder_offset && task.due_at) {
    let courseName: string | undefined;
    if (task.course_id) {
      const course = await db.course.get(task.course_id);
      courseName = course?.code || course?.name;
    }
    await scheduleTaskReminder({
      id: task.id,
      title: task.title,
      type: task.type,
      due_at: task.due_at,
      venue: task.venue,
      reminder_offset: task.reminder_offset,
      course_name: courseName,
    });
  }
}

export async function deleteTask(id: string): Promise<void> {
  const task = await db.task.get(id);
  if (!task) return;

  const now = new Date().toISOString();

  await db.task.update(id, {
    deleted_at: now,
    updated_at: now,
  });

  // Soft delete linked calendar event to prevent orphans
  if (task.calendar_event_id) {
    await db.calendar_event.update(task.calendar_event_id, {
      deleted_at: now,
      updated_at: now,
    });
  } else if (isExamType(task.type) && task.due_at) {
    // Check for legacy calendar events created without calendar_event_id
    const examDate = task.due_at.slice(0, 10);
    const events = await db.calendar_event
      .where('date')
      .equals(examDate)
      .filter(e => e.deleted_at === null && e.type === 'exam' && e.note !== null && e.note.includes(task.title))
      .toArray();
    for (const ev of events) {
      await db.calendar_event.update(ev.id, {
        deleted_at: now,
        updated_at: now,
      });
    }
  }

  await cancelTaskReminder(id);
}

export async function clearCompletedTasks(): Promise<number> {
  const completedTasks = await db.task
    .filter(t => t.deleted_at === null && t.done === true)
    .toArray();

  const now = new Date().toISOString();

  for (const t of completedTasks) {
    await db.task.update(t.id, {
      deleted_at: now,
      updated_at: now,
    });
    if (t.calendar_event_id) {
      await db.calendar_event.update(t.calendar_event_id, {
        deleted_at: now,
        updated_at: now,
      });
    }
    await cancelTaskReminder(t.id);
  }

  return completedTasks.length;
}

export async function duplicateTask(id: string): Promise<Task | null> {
  const original = await db.task.get(id);
  if (!original) return null;

  const { id: _id, created_at: _c, updated_at: _u, deleted_at: _d, calendar_event_id: _cal, ...dataToClone } = original;

  return createTask({
    ...dataToClone,
    title: `${original.title} (Copy)`,
    done: false,
    obtained_marks: null,
  });
}


export async function updateExamClassMode(
  taskId: string,
  mode: ExamClassMode,
  endTime?: string | null
): Promise<void> {
  const updates: Partial<Task> = {
    exam_class_mode: mode,
    updated_at: new Date().toISOString(),
  };
  if (endTime !== undefined) {
    updates.end_time = endTime;
  }
  await db.task.update(taskId, updates);
}
