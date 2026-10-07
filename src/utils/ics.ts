import { Course, TimetableSlot, Term, Task } from '../types';

/**
 * RFC 5545 iCalendar (.ics) generator for Spirit
 * Enables users to export recurring timetable slots and exams/tasks
 * to Google Calendar, Apple Calendar, Outlook, etc., so they receive
 * native OS alarms even when the app is closed.
 */

const DAY_MAP: Record<number, string> = {
  0: 'SU',
  1: 'MO',
  2: 'TU',
  3: 'WE',
  4: 'TH',
  5: 'FR',
  6: 'SA',
};

// Formats YYYY-MM-DD + HH:mm into compact iCal timestamp YYYYMMDDTHHMMSS
function formatIcalDateTime(dateStr: string, timeStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  const cleanTime = timeStr.replace(/:/g, '').padEnd(6, '0').slice(0, 6);
  return `${cleanDate}T${cleanTime}`;
}

// Formats YYYY-MM-DD into YYYYMMDDT235959Z for UNTIL clause
function formatIcalUntil(dateStr: string): string {
  const cleanDate = dateStr.replace(/-/g, '');
  return `${cleanDate}T235959Z`;
}

// Escapes special characters for iCalendar text fields
function escapeIcalText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Finds the first specific day of week (0=Sun ... 6=Sat) on or after startDateStr
 */
function getFirstDateForWeekday(startDateStr: string, targetWeekday: number): string {
  const start = new Date(startDateStr);
  const currentJsDay = start.getDay(); // 0 is Sunday, 1 is Monday...

  let diffDays = targetWeekday - currentJsDay;
  if (diffDays < 0) {
    diffDays += 7;
  }

  const firstDate = new Date(start);
  firstDate.setDate(firstDate.getDate() + diffDays);
  return firstDate.toISOString().slice(0, 10);
}

/**
 * Generates .ics file content for recurring timetable slots
 */
export function generateTimetableIcs(params: {
  term: Term;
  slots: TimetableSlot[];
  courses: Course[];
}): string {
  const { term, slots, courses } = params;
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spirit//Academic Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Spirit Timetable - ${escapeIcalText(term.name)}`,
  ];

  for (const slot of slots) {
    const course = courseMap.get(slot.course_id);
    const summary = course ? `${course.name} (${course.code || slot.component_type})` : `Class (${slot.component_type})`;
    
    // Calculate the first instance of this slot
    const firstDate = getFirstDateForWeekday(term.start_date, slot.weekday);
    const dtStart = formatIcalDateTime(firstDate, slot.start_time);
    const dtEnd = formatIcalDateTime(firstDate, slot.end_time);
    const until = formatIcalUntil(term.end_date);
    const byDay = DAY_MAP[slot.weekday] || 'MO';

    const descParts: string[] = [];
    if (slot.room) descParts.push(`Room: ${slot.room}`);
    if (slot.faculty) descParts.push(`Faculty: ${slot.faculty}`);
    descParts.push(`Type: ${slot.component_type.toUpperCase()}`);
    if ((slot.weight ?? 1) > 1) descParts.push(`Weight: ${slot.weight} periods`);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:spirit-slot-${slot.id}@spirit.local`);
    lines.push(`DTSTAMP:${formatIcalDateTime(new Date().toISOString().slice(0, 10), '12:00')}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`RRULE:FREQ=WEEKLY;UNTIL=${until};BYDAY=${byDay}`);
    lines.push(`SUMMARY:${escapeIcalText(summary)}`);
    if (slot.room) lines.push(`LOCATION:${escapeIcalText(slot.room)}`);
    lines.push(`DESCRIPTION:${escapeIcalText(descParts.join(' | '))}`);
    
    // Add reminder 15 minutes before
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT15M');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcalText(summary)} in 15 minutes`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Generates .ics file content for upcoming tasks and exams
 */
export function generateTasksIcs(params: {
  tasks: Task[];
  courses: Course[];
}): string {
  const { tasks, courses } = params;
  const courseMap = new Map<string, Course>(courses.map(c => [c.id, c]));

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spirit//Academic Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Spirit Exams and Deadlines',
  ];

  for (const task of tasks) {
    if (!task.due_at) continue;

    const course = task.course_id ? courseMap.get(task.course_id) : null;
    const taskTypeLabel = task.type.toUpperCase();
    const summary = course ? `[${course.name}] ${task.title}` : `[${taskTypeLabel}] ${task.title}`;

    const dateStr = task.due_at.slice(0, 10);
    const timeStr = task.due_at.length >= 16 ? task.due_at.slice(11, 16) : '09:00';
    const dtStart = formatIcalDateTime(dateStr, timeStr);
    
    // Default duration: 1 hour or 2 hours for exam
    const endHour = (parseInt(timeStr.slice(0, 2), 10) + (task.type === 'exam' || task.type === 'mid_sem' || task.type === 'end_sem' ? 3 : 1)).toString().padStart(2, '0');
    const dtEnd = formatIcalDateTime(dateStr, `${endHour}:${timeStr.slice(3, 5)}`);

    const descParts: string[] = [];
    if (task.notes) descParts.push(task.notes);
    if (task.venue) descParts.push(`Venue: ${task.venue}`);
    if (task.syllabus) descParts.push(`Syllabus: ${task.syllabus}`);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:spirit-task-${task.id}@spirit.local`);
    lines.push(`DTSTAMP:${formatIcalDateTime(new Date().toISOString().slice(0, 10), '12:00')}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcalText(summary)}`);
    if (task.venue) lines.push(`LOCATION:${escapeIcalText(task.venue)}`);
    if (descParts.length > 0) lines.push(`DESCRIPTION:${escapeIcalText(descParts.join(' | '))}`);

    // Add 1-day prior and 2-hour prior alarms
    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-P1D');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcalText(summary)} is due tomorrow`);
    lines.push('END:VALARM');

    lines.push('BEGIN:VALARM');
    lines.push('TRIGGER:-PT2H');
    lines.push('ACTION:DISPLAY');
    lines.push(`DESCRIPTION:Reminder: ${escapeIcalText(summary)} in 2 hours`);
    lines.push('END:VALARM');

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Downloads or shares the generated .ics file
 */
export async function downloadOrShareIcs(filename: string, icsContent: string): Promise<boolean> {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });

  // On modern mobile devices, try native Web Share API
  if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare) {
    try {
      const file = new File([blob], filename, { type: 'text/calendar' });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: 'Spirit Academic Calendar export',
        });
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Web Share failed, falling back to download:', err);
      } else {
        return true; // User cancelled share sheet
      }
    }
  }

  // Standard browser file download fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
