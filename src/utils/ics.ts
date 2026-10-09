import { Course, TimetableSlot, Term, Task, CalendarEvent } from '../types';
import { isSaturdayOff } from '../engine/timetable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { requestStoragePermissions } from './storagePermissions';

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
 * Generates .ics file content for recurring timetable slots, accurately
 * accounting for Saturday rules (2nd off, 2nd & 4th off, all off) and holidays.
 */
export function generateTimetableIcs(params: {
  term: Term;
  slots: TimetableSlot[];
  courses: Course[];
  calendarEvents?: CalendarEvent[];
}): string {
  const { term, slots, courses, calendarEvents = [] } = params;
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

    // Collect all candidate dates for this slot's weekday within the term
    const candidateDates: string[] = [];
    const cur = new Date(term.start_date + 'T00:00:00Z');
    const end = new Date(term.end_date + 'T23:59:59Z');

    const startWeekday = cur.getUTCDay();
    let diff = slot.weekday - startWeekday;
    if (diff < 0) diff += 7;
    cur.setUTCDate(cur.getUTCDate() + diff);

    while (cur <= end) {
      candidateDates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 7);
    }

    if (candidateDates.length === 0) continue;

    const isDateOff = (dateStr: string): boolean => {
      // 1. Saturday working rules
      if (slot.weekday === 6 && isSaturdayOff(dateStr, term.saturday_rule)) {
        return true;
      }
      // 2. Term holidays
      const isHol = calendarEvents.some(e => {
        if (e.deleted_at || e.type !== 'holiday') return false;
        if (e.end_date) {
          return dateStr >= e.date && dateStr <= e.end_date;
        }
        return dateStr === e.date;
      });
      return isHol;
    };

    // Find first working occurrence in the term for DTSTART
    const firstWorkingIdx = candidateDates.findIndex(d => !isDateOff(d));
    if (firstWorkingIdx === -1) {
      // All occurrences of this weekday are off during the term
      continue;
    }

    const firstDate = candidateDates[firstWorkingIdx];
    const dtStart = formatIcalDateTime(firstDate, slot.start_time);
    const dtEnd = formatIcalDateTime(firstDate, slot.end_time);
    const until = formatIcalUntil(term.end_date);
    const byDay = DAY_MAP[slot.weekday] || 'MO';

    // Collect EXDATEs for off-Saturdays and holidays after the first working date
    const exDates: string[] = [];
    for (let i = firstWorkingIdx + 1; i < candidateDates.length; i++) {
      const d = candidateDates[i];
      if (isDateOff(d)) {
        exDates.push(formatIcalDateTime(d, slot.start_time));
      }
    }

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
    for (const exDate of exDates) {
      lines.push(`EXDATE:${exDate}`);
    }
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
    
    // Default duration: 1 hour or 2-3 hours for exam
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
 * Directly opens or imports the .ics calendar file using the device's native Calendar app
 * (Google Calendar, Samsung Calendar, Apple Calendar, etc.)
 */
export async function openInCalendarApp(filename: string, icsContent: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await requestStoragePermissions();

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: icsContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Passing files without text allows Android FileProvider to recognize MIME text/calendar,
      // prompting Android to display Calendar apps (Google Calendar, Samsung Calendar, etc.).
      await Share.share({
        title: filename,
        files: [writeResult.uri],
        dialogTitle: 'Open with Calendar',
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return true;
      }
      console.warn('Native open in calendar failed, falling back to download:', err);
    }
  }

  // On Web / Desktop: download the .ics file which triggers default desktop calendar app
  return downloadIcsFile(filename, icsContent);
}

/**
 * Shares the .ics file via standard system share sheet (WhatsApp, Drive, Email, etc.)
 */
export async function shareIcsFile(filename: string, icsContent: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await requestStoragePermissions();

      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: icsContent,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      await Share.share({
        title: filename,
        text: 'Spirit Academic Calendar export (.ics)',
        files: [writeResult.uri],
        dialogTitle: 'Share .ics Calendar File',
      });
      return true;
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return true;
      }
      console.warn('Native share failed, falling back to download:', err);
    }
  }

  if (typeof navigator !== 'undefined' && 'canShare' in navigator && navigator.canShare) {
    try {
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
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
      if (err?.name !== 'AbortError') {
        console.warn('Web Share failed, falling back to download:', err);
      } else {
        return true;
      }
    }
  }

  return downloadIcsFile(filename, icsContent);
}

/**
 * Downloads the .ics file directly to storage
 */
export async function downloadIcsFile(filename: string, icsContent: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      await requestStoragePermissions();
      await Filesystem.writeFile({
        path: filename,
        data: icsContent,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
    } catch (err) {
      console.warn('Writing to Documents directory failed:', err);
    }
  }

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
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

/**
 * Downloads the .ics file and opens Google Calendar web import page in browser
 */
export async function openGoogleCalendarImport(filename: string, icsContent: string): Promise<boolean> {
  await downloadIcsFile(filename, icsContent);
  window.open('https://calendar.google.com/calendar/r/settings/export', '_blank');
  return true;
}

/**
 * Backward-compatible download or share helper
 */
export async function downloadOrShareIcs(filename: string, icsContent: string): Promise<boolean> {
  return shareIcsFile(filename, icsContent);
}


