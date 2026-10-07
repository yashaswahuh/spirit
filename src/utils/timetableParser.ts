/**
 * Spirit Smart Timetable Parser & Auto-Recognition Engine
 * Parses raw timetable files (.csv, .tsv, .txt, .json) and pasted text in matrix or list formats.
 * Automatically recognizes days, period times, subject names, course codes, labs, and faculty.
 */

import { Weekday, CourseType, Course } from '../types';

export interface ParsedCourseItem {
  rawName: string;
  cleanName: string;
  code: string;
  type: CourseType;
  color: string;
  isExisting: boolean;
  existingCourseId?: string;
}

export interface ParsedSlotItem {
  weekday: Weekday;
  dayName: string;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  courseRawName: string;
  room: string | null;
  faculty: string | null;
  componentType: CourseType;
  weight: number;
}

export interface ParsedTimetableResult {
  detectedCourses: ParsedCourseItem[];
  detectedSlots: ParsedSlotItem[];
  totalSlots: number;
  warnings: string[];
}

const PALETTE = [
  '#6366f1', // Indigo
  '#0ea5e9', // Sky
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#14b8a6', // Teal
  '#f97316', // Orange
  '#06b6d4', // Cyan
  '#84cc16', // Lime
];

const DEFAULT_PERIOD_TIMINGS = [
  { start: '09:00', end: '09:55' },
  { start: '09:55', end: '10:50' },
  { start: '11:15', end: '12:10' },
  { start: '12:10', end: '13:05' },
  { start: '14:00', end: '14:55' },
  { start: '14:55', end: '15:50' },
  { start: '16:00', end: '16:55' },
];

const DAY_MAP: Record<string, Weekday> = {
  monday: 1,
  mon: 1,
  m: 1,
  tuesday: 2,
  tue: 2,
  tues: 2,
  tu: 2,
  wednesday: 3,
  wed: 3,
  w: 3,
  thursday: 4,
  thu: 4,
  thur: 4,
  thurs: 4,
  th: 4,
  friday: 5,
  fri: 5,
  f: 5,
  saturday: 6,
  sat: 6,
  s: 6,
  sunday: 0,
  sun: 0,
};

const DAY_NAMES: Record<Weekday, string> = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  0: 'Sunday',
};

const IGNORED_SUBJECT_WORDS = new Set([
  'free',
  'break',
  'lunch',
  'recess',
  'nil',
  'na',
  'n/a',
  'none',
  '-',
  '--',
  '---',
  'library',
  'sports',
  'remedial',
  'assembly',
]);

/**
 * Normalizes day string to Weekday enum number (0-6).
 */
export function parseWeekday(str: string): Weekday | null {
  const clean = str.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (DAY_MAP[clean] !== undefined) return DAY_MAP[clean];
  return null;
}

/**
 * Extracts start and end time (HH:mm) from a string like "09:00 - 09:55" or "9:00 to 10:00" or "9:00-10:00".
 */
export function extractTimeRange(str: string): { start: string; end: string } | null {
  const match = str.match(/(\d{1,2}):(\d{2})\s*(?:-|to|–|—)\s*(\d{1,2}):(\d{2})/i);
  if (match) {
    const startH = match[1].padStart(2, '0');
    const startM = match[2];
    const endH = match[3].padStart(2, '0');
    const endM = match[4];
    return {
      start: `${startH}:${startM}`,
      end: `${endH}:${endM}`,
    };
  }
  return null;
}

/**
 * Computes slot weight (number of periods) from time span.
 */
export function calculateWeightFromTimes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diffMinutes = eh * 60 + em - (sh * 60 + sm);
  if (diffMinutes >= 150) return 3;
  if (diffMinutes >= 95) return 2;
  return 1;
}

/**
 * Extracts course name, course code, and component type from raw subject text.
 * e.g. "Data Structures (CS201) [Lab]" -> { cleanName: "Data Structures", code: "CS201", type: "lab" }
 */
export function parseSubjectInfo(raw: string): {
  cleanName: string;
  code: string;
  type: CourseType;
  explicitCode?: string;
} {
  let text = raw.trim();

  // Detect component type
  let type: CourseType = 'theory';
  const lower = text.toLowerCase();
  if (lower.includes('lab') || lower.includes('practical')) {
    type = 'lab';
  } else if (lower.includes('tutorial') || lower.includes('tut')) {
    type = 'tutorial';
  } else if (lower.includes('project') || lower.includes('viva')) {
    type = 'project';
  } else if (lower.includes('elective')) {
    type = 'elective';
  }

  // Look for course code in parentheses, e.g. "Data Structures (CS-201)"
  let explicitCode: string | undefined = undefined;
  let code = '';
  const codeMatch = text.match(/\(([^)]+)\)/);
  if (codeMatch) {
    const potentialCode = codeMatch[1].trim();
    if (potentialCode.length <= 10 && /\d/.test(potentialCode)) {
      explicitCode = potentialCode;
      code = potentialCode;
      text = text.replace(codeMatch[0], '').trim();
    }
  }

  // Remove bracket annotations e.g. "[Lab]"
  text = text.replace(/\[[^\]]+\]/g, '').trim();

  // If component is lab/practical, clean trailing "Lab" or "Practical" from the course cleanName
  let cleanName = text;
  if (type === 'lab') {
    const stripped = text
      .replace(/\b(lab|laboratory|practical)\b/gi, '')
      .replace(/[-–—/]+$/, '')
      .trim();
    if (stripped.length >= 2) {
      cleanName = stripped;
    }
  }

  // If no code extracted, create code from uppercase initials
  if (!code) {
    const words = cleanName
      .split(/[\s_-]+/)
      .filter(w => w.length > 0 && !['and', '&', 'of', 'for', 'in', 'the'].includes(w.toLowerCase()));
    if (words.length >= 2) {
      code = words
        .slice(0, 4)
        .map(w => w[0].toUpperCase())
        .join('');
    } else if (words.length === 1) {
      code = words[0].slice(0, 4).toUpperCase();
    } else {
      code = 'SUBJ';
    }
  }

  return {
    cleanName: cleanName || raw.trim(),
    code: code || 'SUBJ',
    type,
    explicitCode,
  };
}

/**
 * Main parser function: parses timetable string input (CSV, TSV, or plaintext).
 */
export function parseTimetableFile(
  content: string,
  existingCourses: Course[] = []
): ParsedTimetableResult {
  const warnings: string[] = [];
  const rawSlots: ParsedSlotItem[] = [];

  const lines = content
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { detectedCourses: [], detectedSlots: [], totalSlots: 0, warnings: ['File is empty.'] };
  }

  // Try parsing JSON first if content looks like JSON
  if (content.trim().startsWith('[') || content.trim().startsWith('{')) {
    try {
      const parsedJson = JSON.parse(content);
      const items = Array.isArray(parsedJson) ? parsedJson : parsedJson.slots || parsedJson.timetable || [];
      if (Array.isArray(items) && items.length > 0) {
        for (const item of items) {
          const weekday = typeof item.weekday === 'number' ? (item.weekday as Weekday) : parseWeekday(String(item.day || item.weekday || ''));
          if (weekday === null) continue;

          const rawName = String(item.course || item.subject || item.name || '').trim();
          if (!rawName) continue;

          const startTime = String(item.start_time || item.startTime || '09:00').slice(0, 5);
          const endTime = String(item.end_time || item.endTime || '09:55').slice(0, 5);
          const { type } = parseSubjectInfo(rawName);

          rawSlots.push({
            weekday,
            dayName: DAY_NAMES[weekday],
            startTime,
            endTime,
            courseRawName: rawName,
            room: item.room ? String(item.room).trim() : null,
            faculty: item.faculty ? String(item.faculty).trim() : null,
            componentType: (item.component_type || type) as CourseType,
            weight: item.weight || calculateWeightFromTimes(startTime, endTime),
          });
        }

        return finalizeResult(rawSlots, existingCourses, warnings);
      }
    } catch {
      // Fallback to tabular parser
    }
  }

  // Detect delimiter: tab or comma or pipe or semicolon
  const sample = lines.slice(0, 5).join('\n');
  let delimiter = ',';
  if (sample.includes('\t')) delimiter = '\t';
  else if (sample.includes('|')) delimiter = '|';
  else if (sample.includes(';')) delimiter = ';';

  const rows = lines.map(line =>
    line
      .split(delimiter)
      .map(cell => cell.trim().replace(/^["']|["']$/g, ''))
  );

  // Check if Row 1 or Column 1 contains days (Matrix format) vs List format
  const header = rows[0];
  const headerLower = header.map(h => h.toLowerCase());
  const hasListKeywords = headerLower.some(h =>
    ['subject', 'course', 'room', 'faculty', 'teacher', 'slot', 'component', 'code'].includes(h)
  );

  const firstColDays = rows.slice(1).map(r => parseWeekday(r[0]));
  const firstColValidDays = firstColDays.filter((d): d is Weekday => d !== null);
  const uniqueFirstColDays = new Set(firstColValidDays);
  const hasDuplicateDaysInFirstCol = firstColValidDays.length > uniqueFirstColDays.size;

  const headerDays = header.slice(1).map(c => parseWeekday(c));
  const isHeaderDays = headerDays.filter(d => d !== null).length >= 2;

  // Format 1 is a Matrix (Days down Col 0, Periods across headers) ONLY if no list keywords and no duplicate days in Col 0
  const isMatrixFormat1 = !hasListKeywords && !hasDuplicateDaysInFirstCol && firstColValidDays.length >= 2;

  if (isMatrixFormat1) {
    // FORMAT 1: Days down the first column (Rows = Days, Columns = Periods/Times)
    // Header cells contains period timings or numbers
    const columnTimings = header.slice(1).map((cell, idx) => {
      const extracted = extractTimeRange(cell);
      if (extracted) return extracted;
      // Fallback to default period timing index
      return DEFAULT_PERIOD_TIMINGS[idx % DEFAULT_PERIOD_TIMINGS.length];
    });

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const weekday = parseWeekday(row[0]);
      if (weekday === null) continue;

      for (let c = 1; c < row.length; c++) {
        const cell = row[c];
        if (!cell || IGNORED_SUBJECT_WORDS.has(cell.toLowerCase())) continue;

        const timing = columnTimings[c - 1] || DEFAULT_PERIOD_TIMINGS[0];
        const { type } = parseSubjectInfo(cell);

        rawSlots.push({
          weekday,
          dayName: DAY_NAMES[weekday],
          startTime: timing.start,
          endTime: timing.end,
          courseRawName: cell,
          room: null,
          faculty: null,
          componentType: type,
          weight: calculateWeightFromTimes(timing.start, timing.end),
        });
      }
    }
  } else if (isHeaderDays) {
    // FORMAT 2: Days across the header columns (Rows = Time slots, Columns = Days)
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const timeCell = row[0];
      const timing = extractTimeRange(timeCell) || DEFAULT_PERIOD_TIMINGS[(r - 1) % DEFAULT_PERIOD_TIMINGS.length];

      for (let c = 1; c < row.length; c++) {
        const weekday = headerDays[c - 1];
        if (weekday === null || weekday === undefined) continue;

        const cell = row[c];
        if (!cell || IGNORED_SUBJECT_WORDS.has(cell.toLowerCase())) continue;

        const { type } = parseSubjectInfo(cell);

        rawSlots.push({
          weekday,
          dayName: DAY_NAMES[weekday],
          startTime: timing.start,
          endTime: timing.end,
          courseRawName: cell,
          room: null,
          faculty: null,
          componentType: type,
          weight: calculateWeightFromTimes(timing.start, timing.end),
        });
      }
    }
  } else {
    // FORMAT 3: Line / Record list format (e.g. Day, Time, Subject, Room, Faculty)
    const startRowIdx = hasListKeywords || parseWeekday(rows[0][0]) === null ? 1 : 0;
    for (let r = startRowIdx; r < rows.length; r++) {
      const row = rows[r];
      if (row.length < 2) continue;

      // Look for day in any of the first 2 columns
      const dayIndex = parseWeekday(row[0]) !== null ? 0 : parseWeekday(row[1]) !== null ? 1 : -1;
      if (dayIndex === -1) continue;

      const weekday = parseWeekday(row[dayIndex])!;

      // Look for time in row
      let startTime = '09:00';
      let endTime = '09:55';

      for (let i = 0; i < row.length; i++) {
        if (i === dayIndex) continue;
        const timeExtracted = extractTimeRange(row[i]);
        if (timeExtracted) {
          startTime = timeExtracted.start;
          endTime = timeExtracted.end;
          break;
        }
      }

      // Subject is the first non-day, non-time column
      let subjectCol = -1;
      for (let i = 0; i < row.length; i++) {
        if (i === dayIndex) continue;
        if (extractTimeRange(row[i])) continue;
        if (row[i].length > 1 && !IGNORED_SUBJECT_WORDS.has(row[i].toLowerCase())) {
          subjectCol = i;
          break;
        }
      }

      if (subjectCol === -1) continue;

      const subjectName = row[subjectCol];
      const room = row[subjectCol + 1] && row[subjectCol + 1].length < 15 ? row[subjectCol + 1] : null;
      const faculty = row[subjectCol + 2] || null;
      const { type } = parseSubjectInfo(subjectName);

      rawSlots.push({
        weekday,
        dayName: DAY_NAMES[weekday],
        startTime,
        endTime,
        courseRawName: subjectName,
        room,
        faculty,
        componentType: type,
        weight: calculateWeightFromTimes(startTime, endTime),
      });
    }
  }

  return finalizeResult(rawSlots, existingCourses, warnings);
}

function finalizeResult(
  rawSlots: ParsedSlotItem[],
  existingCourses: Course[],
  warnings: string[]
): ParsedTimetableResult {
  // Aggregate unique courses
  const courseMap = new Map<string, ParsedCourseItem>();
  const baseKeyToRawName = new Map<string, string>();
  let paletteIdx = 0;

  for (const slot of rawSlots) {
    const rawName = slot.courseRawName.trim();
    const { cleanName, code, type, explicitCode } = parseSubjectInfo(rawName);

    // Grouping key:
    // If an explicit code was provided (e.g. CS201 / CS201L), normalize by stripping trailing 'L'.
    // Otherwise group by normalized course name (where trailing "Lab" / "Practical" was already stripped).
    const normalizedExplicitCode = explicitCode
      ? explicitCode.replace(/L$/i, '').toUpperCase().replace(/[^A-Z0-9]/g, '')
      : '';
    const normalizedNameKey = (type === 'lab' ? cleanName.replace(/\b(lab|laboratory|practical)\b/gi, '').replace(/l$/i, '') : cleanName)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const baseKey = normalizedExplicitCode ? `code:${normalizedExplicitCode}` : `name:${normalizedNameKey}`;

    const existingRawName = baseKeyToRawName.get(baseKey);

    if (existingRawName && courseMap.has(existingRawName)) {
      // Course already encountered! If one is lab and one is theory, upgrade to theory_and_lab
      const existingItem = courseMap.get(existingRawName)!;
      if (
        (existingItem.type === 'theory' && type === 'lab') ||
        (existingItem.type === 'lab' && type === 'theory')
      ) {
        existingItem.type = 'theory_and_lab';
      }
      // If the existing course was just "lab" and had a trailing L code, clean it up
      if (normalizedExplicitCode && existingItem.code.endsWith('L') && !explicitCode?.endsWith('L')) {
        existingItem.code = explicitCode || normalizedExplicitCode;
      }
      // Point this slot to the primary course
      slot.courseRawName = existingRawName;
      slot.componentType = type === 'lab' ? 'lab' : 'theory';
    } else if (!courseMap.has(rawName)) {
      // Check match with existing courses by code or name
      const existing = existingCourses.find(
        c =>
          (explicitCode && c.code.toLowerCase() === explicitCode.toLowerCase()) ||
          (normalizedExplicitCode && c.code.toLowerCase() === normalizedExplicitCode.toLowerCase()) ||
          c.name.toLowerCase() === cleanName.toLowerCase() ||
          c.name.toLowerCase() === rawName.toLowerCase() ||
          c.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedNameKey
      );

      let finalType: CourseType = existing ? existing.type : type;
      if (existing && existing.type === 'theory' && type === 'lab') {
        finalType = 'theory_and_lab';
      }

      courseMap.set(rawName, {
        rawName,
        cleanName,
        code: (normalizedExplicitCode || code),
        type: finalType,
        color: existing ? existing.color : PALETTE[paletteIdx % PALETTE.length],
        isExisting: !!existing,
        existingCourseId: existing?.id,
      });

      baseKeyToRawName.set(baseKey, rawName);
      paletteIdx++;
    }
  }

  // Sort slots by weekday and start time
  rawSlots.sort((a, b) => {
    if (a.weekday !== b.weekday) return a.weekday - b.weekday;
    return a.startTime.localeCompare(b.startTime);
  });

  return {
    detectedCourses: Array.from(courseMap.values()),
    detectedSlots: rawSlots,
    totalSlots: rawSlots.length,
    warnings,
  };
}
