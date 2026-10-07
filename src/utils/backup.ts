/**
 * Local Data Safety: Backup and Restore Engine
 * Handles versioned JSON export/import, CSV export, Zod schema validation,
 * merge conflict resolution (newer updated_at wins), and mobile share sheet.
 */

import type { Table } from 'dexie';
import { db } from '../db/dexie';
import {
  backupPayloadSchema,
  type BackupPayload,
} from '../db/schemas';
import {
  recordBackupExported,
} from './storage';

export type { BackupPayload };

export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_APP_ID = 'spirit';

export interface BackupCounts {
  profiles: number;
  programs: number;
  gradingSchemes: number;
  terms: number;
  courses: number;
  timetableVersions: number;
  timetableSlots: number;
  timetableOverrides: number;
  calendarEvents: number;
  attendanceRecords: number;
  assessmentComponents: number;
  marks: number;
  gradeResults: number;
  tasks: number;
  totalRecords: number;
}

export type BackupValidationResult =
  | { success: true; payload: BackupPayload; counts: BackupCounts }
  | { success: false; error: string; details?: string[] };

/**
 * Escapes values for CSV in adherence with RFC 4180.
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Resolves merge conflicts between existing and incoming entities.
 * Newer updated_at wins. If timestamps are equal or incoming is newer, incoming wins.
 */
export function shouldIncomingEntityWin(
  existing: { updated_at: string } | undefined | null,
  incoming: { updated_at: string }
): boolean {
  if (!existing) return true;
  const existingTime = new Date(existing.updated_at).getTime();
  const incomingTime = new Date(incoming.updated_at).getTime();
  if (isNaN(incomingTime)) return false;
  if (isNaN(existingTime)) return true;
  return incomingTime >= existingTime;
}

/**
 * Queries all Dexie tables to construct a complete BackupPayload object.
 */
export async function createBackupPayload(): Promise<BackupPayload> {
  const [
    profile,
    grading_scheme,
    program,
    term,
    course,
    timetable_version,
    timetable_slot,
    timetable_override,
    calendar_event,
    attendance_record,
    assessment_component,
    mark,
    grade_result,
    task,
  ] = await Promise.all([
    db.profile.toArray(),
    db.grading_scheme.toArray(),
    db.program.toArray(),
    db.term.toArray(),
    db.course.toArray(),
    db.timetable_version.toArray(),
    db.timetable_slot.toArray(),
    db.timetable_override.toArray(),
    db.calendar_event.toArray(),
    db.attendance_record.toArray(),
    db.assessment_component.toArray(),
    db.mark.toArray(),
    db.grade_result.toArray(),
    db.task.toArray(),
  ]);

  return {
    app: BACKUP_APP_ID,
    version: BACKUP_SCHEMA_VERSION,
    exported_at: new Date().toISOString(),
    data: {
      profile,
      program,
      grading_scheme,
      term,
      course,
      timetable_version,
      timetable_slot,
      timetable_override,
      calendar_event,
      attendance_record,
      assessment_component,
      mark,
      grade_result,
      task,
    },
  };
}

/**
 * Generates full JSON backup string and marks backup timestamp.
 */
export async function exportBackupJson(): Promise<{
  payload: BackupPayload;
  jsonString: string;
  filename: string;
}> {
  const payload = await createBackupPayload();
  const jsonString = JSON.stringify(payload, null, 2);
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `spirit-backup-${dateStr}.json`;

  recordBackupExported();

  return { payload, jsonString, filename };
}

/**
 * Generates an RFC-compliant CSV of all attendance records with course names.
 */
export async function exportAttendanceCsv(): Promise<{
  csvString: string;
  filename: string;
}> {
  const [records, courses] = await Promise.all([
    db.attendance_record.toArray(),
    db.course.toArray(),
  ]);

  const courseMap = new Map<string, { code: string; name: string }>();
  for (const c of courses) {
    courseMap.set(c.id, { code: c.code || '', name: c.name });
  }

  // Sort by date descending
  const sortedRecords = [...records].sort((a, b) => b.date.localeCompare(a.date));

  const headers = ['Date', 'Course Code', 'Course Name', 'Status', 'Weight', 'Note'];
  const rows = sortedRecords.map(r => {
    const course = courseMap.get(r.course_id);
    return [
      escapeCsvCell(r.date),
      escapeCsvCell(course?.code || ''),
      escapeCsvCell(course?.name || 'Unknown Course'),
      escapeCsvCell(r.status),
      escapeCsvCell(r.weight ?? 1),
      escapeCsvCell(r.note || ''),
    ].join(',');
  });

  const csvString = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `spirit-attendance-${dateStr}.csv`;

  return { csvString, filename };
}

/**
 * Generates an RFC-compliant CSV of all marks with course and component names.
 */
export async function exportMarksCsv(): Promise<{
  csvString: string;
  filename: string;
}> {
  const [marks, components, courses] = await Promise.all([
    db.mark.toArray(),
    db.assessment_component.toArray(),
    db.course.toArray(),
  ]);

  const courseMap = new Map<string, { code: string; name: string }>();
  for (const c of courses) {
    courseMap.set(c.id, { code: c.code || '', name: c.name });
  }

  const componentMap = new Map<string, { name: string; max_marks: number; weightage: number; course_id: string }>();
  for (const comp of components) {
    componentMap.set(comp.id, comp);
  }

  const headers = [
    'Course Code',
    'Course Name',
    'Component Name',
    'Max Marks',
    'Weightage %',
    'Obtained Marks',
    'Status',
  ];

  const rows = marks.map(m => {
    const comp = componentMap.get(m.component_id);
    const course = comp ? courseMap.get(comp.course_id) : undefined;
    return [
      escapeCsvCell(course?.code || ''),
      escapeCsvCell(course?.name || 'Unknown Course'),
      escapeCsvCell(comp?.name || 'Unknown Component'),
      escapeCsvCell(comp?.max_marks ?? ''),
      escapeCsvCell(comp?.weightage ?? ''),
      escapeCsvCell(m.obtained_marks !== null && m.obtained_marks !== undefined ? m.obtained_marks : ''),
      escapeCsvCell(m.status || 'entered'),
    ].join(',');
  });

  const csvString = [headers.join(','), ...rows].join('\r\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `spirit-marks-${dateStr}.csv`;

  return { csvString, filename };
}

/**
 * Triggers native Share Sheet on mobile (for WhatsApp, Google Drive, AirDrop, etc.),
 * falling back cleanly to direct file download if unsupported or canceled.
 */
export async function downloadOrShareFile(options: {
  filename: string;
  content: string;
  mimeType: string;
  title: string;
  preferShare?: boolean;
}): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const { filename, content, mimeType, title, preferShare = true } = options;

  if (
    preferShare &&
    typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function'
  ) {
    try {
      const file = new File([content], filename, { type: mimeType });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `Spirit file backup: ${filename}`,
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User closed or canceled share sheet
        return 'cancelled';
      }
      // If share fails for other reasons, proceed to download fallback
    }
  }

  // Fallback to standard browser download via blob
  const blob = new Blob([content], { type: mimeType });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

  return 'downloaded';
}

/**
 * Validates raw backup JSON string. Checks app ID, schema version, and Zod models.
 */
export function parseAndValidateBackup(fileText: string): BackupValidationResult {
  let rawJson: unknown;
  try {
    rawJson = JSON.parse(fileText);
  } catch {
    return {
      success: false,
      error: 'Malformed backup file: Invalid JSON syntax.',
    };
  }

  if (typeof rawJson !== 'object' || rawJson === null) {
    return {
      success: false,
      error: 'Invalid backup format: root must be an object.',
    };
  }

  const obj = rawJson as Record<string, unknown>;

  if (obj.app !== BACKUP_APP_ID) {
    return {
      success: false,
      error: 'Invalid backup file: Not a Spirit backup (missing or incorrect app identifier).',
    };
  }

  if (typeof obj.version !== 'number') {
    return {
      success: false,
      error: 'Invalid backup file: Missing schema version number.',
    };
  }

  if (obj.version > BACKUP_SCHEMA_VERSION) {
    return {
      success: false,
      error: `This backup was created by a newer version of Spirit (version ${obj.version}). Current app version supports schema version ${BACKUP_SCHEMA_VERSION}. Please update Spirit before importing this file.`,
    };
  }

  // Validate using Zod
  const parseResult = backupPayloadSchema.safeParse(rawJson);
  if (!parseResult.success) {
    const errorDetails = parseResult.error.issues.map(
      issue => `${issue.path.join('.') || 'root'}: ${issue.message}`
    );
    return {
      success: false,
      error: 'Backup validation failed: The file contains invalid or corrupted data.',
      details: errorDetails.slice(0, 10), // Limit to top 10 for clean display
    };
  }

  const payload = parseResult.data;
  const counts: BackupCounts = {
    profiles: payload.data.profile.length,
    programs: payload.data.program.length,
    gradingSchemes: payload.data.grading_scheme.length,
    terms: payload.data.term.length,
    courses: payload.data.course.length,
    timetableVersions: payload.data.timetable_version.length,
    timetableSlots: payload.data.timetable_slot.length,
    timetableOverrides: payload.data.timetable_override.length,
    calendarEvents: payload.data.calendar_event.length,
    attendanceRecords: payload.data.attendance_record.length,
    assessmentComponents: payload.data.assessment_component.length,
    marks: payload.data.mark.length,
    gradeResults: payload.data.grade_result.length,
    tasks: payload.data.task.length,
    totalRecords:
      payload.data.profile.length +
      payload.data.program.length +
      payload.data.grading_scheme.length +
      payload.data.term.length +
      payload.data.course.length +
      payload.data.timetable_version.length +
      payload.data.timetable_slot.length +
      payload.data.timetable_override.length +
      payload.data.calendar_event.length +
      payload.data.attendance_record.length +
      payload.data.assessment_component.length +
      payload.data.mark.length +
      payload.data.grade_result.length +
      payload.data.task.length,
  };

  return {
    success: true,
    payload,
    counts,
  };
}

/**
 * Restores a validated backup payload into Dexie.
 * Mode 'replace': Clears all tables and writes new records.
 * Mode 'merge': Keeps newer updated_at timestamp per record.
 */
export async function restoreBackup(
  payload: BackupPayload,
  mode: 'merge' | 'replace'
): Promise<{ importedCount: number }> {
  const d = payload.data;
  let importedCount = 0;

  const tables = [
    db.profile,
    db.program,
    db.grading_scheme,
    db.term,
    db.course,
    db.timetable_version,
    db.timetable_slot,
    db.timetable_override,
    db.calendar_event,
    db.attendance_record,
    db.assessment_component,
    db.mark,
    db.grade_result,
    db.task,
  ];

  await db.transaction('rw', tables, async () => {
    if (mode === 'replace') {
      // Clear all 14 tables
      await Promise.all(tables.map(t => t.clear()));

      // Write incoming data
      await Promise.all([
        db.profile.bulkPut(d.profile as any),
        db.program.bulkPut(d.program as any),
        db.grading_scheme.bulkPut(d.grading_scheme as any),
        db.term.bulkPut(d.term as any),
        db.course.bulkPut(d.course as any),
        db.timetable_version.bulkPut(d.timetable_version as any),
        db.timetable_slot.bulkPut(d.timetable_slot as any),
        db.timetable_override.bulkPut(d.timetable_override as any),
        db.calendar_event.bulkPut(d.calendar_event as any),
        db.attendance_record.bulkPut(d.attendance_record as any),
        db.assessment_component.bulkPut(d.assessment_component as any),
        db.mark.bulkPut(d.mark as any),
        db.grade_result.bulkPut(d.grade_result as any),
        db.task.bulkPut(d.task as any),
      ]);

      importedCount =
        d.profile.length +
        d.program.length +
        d.grading_scheme.length +
        d.term.length +
        d.course.length +
        d.timetable_version.length +
        d.timetable_slot.length +
        d.timetable_override.length +
        d.calendar_event.length +
        d.attendance_record.length +
        d.assessment_component.length +
        d.mark.length +
        d.grade_result.length +
        d.task.length;
    } else {
      // Mode 'merge': For each table, compare updated_at
      const mergeTable = async <T extends { id: string; updated_at: string }>(
        table: Table<T, string>,
        incomingItems: T[]
      ) => {
        for (const item of incomingItems) {
          const existing = await table.get(item.id);
          if (shouldIncomingEntityWin(existing, item)) {
            await table.put(item);
            importedCount++;
          }
        }
      };

      await mergeTable(db.profile as any, d.profile);
      await mergeTable(db.program as any, d.program);
      await mergeTable(db.grading_scheme as any, d.grading_scheme);
      await mergeTable(db.term as any, d.term);
      await mergeTable(db.course as any, d.course);
      await mergeTable(db.timetable_version as any, d.timetable_version);
      await mergeTable(db.timetable_slot as any, d.timetable_slot);
      await mergeTable(db.timetable_override as any, d.timetable_override);
      await mergeTable(db.calendar_event as any, d.calendar_event);
      await mergeTable(db.attendance_record as any, d.attendance_record);
      await mergeTable(db.assessment_component as any, d.assessment_component);
      await mergeTable(db.mark as any, d.mark);
      await mergeTable(db.grade_result as any, d.grade_result);
      await mergeTable(db.task as any, d.task);
    }
  });

  recordBackupExported();

  return { importedCount };
}
