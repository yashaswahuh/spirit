import { describe, it, expect } from 'vitest';
import {
  parseWeekday,
  extractTimeRange,
  parseSubjectInfo,
  calculateWeightFromTimes,
  parseTimetableFile,
} from '../timetableParser';

describe('Timetable Parser Unit Tests', () => {
  describe('parseWeekday', () => {
    it('normalizes common weekday strings', () => {
      expect(parseWeekday('Monday')).toBe(1);
      expect(parseWeekday('Mon')).toBe(1);
      expect(parseWeekday('Tuesday')).toBe(2);
      expect(parseWeekday('wed')).toBe(3);
      expect(parseWeekday('Thursday')).toBe(4);
      expect(parseWeekday('Fri')).toBe(5);
      expect(parseWeekday('Saturday')).toBe(6);
      expect(parseWeekday('sun')).toBe(0);
      expect(parseWeekday('InvalidDay')).toBeNull();
    });
  });

  describe('extractTimeRange', () => {
    it('extracts start and end times in various formats', () => {
      expect(extractTimeRange('09:00 - 09:55')).toEqual({ start: '09:00', end: '09:55' });
      expect(extractTimeRange('9:00 to 10:00')).toEqual({ start: '09:00', end: '10:00' });
      expect(extractTimeRange('14:30 – 16:30')).toEqual({ start: '14:30', end: '16:30' });
      expect(extractTimeRange('No time here')).toBeNull();
    });
  });

  describe('calculateWeightFromTimes', () => {
    it('computes slot period weights based on duration', () => {
      expect(calculateWeightFromTimes('09:00', '09:55')).toBe(1); // 55 mins -> 1 period
      expect(calculateWeightFromTimes('09:00', '11:00')).toBe(2); // 120 mins -> 2 periods
      expect(calculateWeightFromTimes('14:00', '17:00')).toBe(3); // 180 mins -> 3 periods
    });
  });

  describe('parseSubjectInfo', () => {
    it('extracts name, course code and detects lab type', () => {
      const res1 = parseSubjectInfo('Data Structures (CS201) [Lab]');
      expect(res1.cleanName).toBe('Data Structures');
      expect(res1.code).toBe('CS201');
      expect(res1.type).toBe('lab');

      const res2 = parseSubjectInfo('Operating Systems');
      expect(res2.cleanName).toBe('Operating Systems');
      expect(res2.code).toBe('OS');
      expect(res2.type).toBe('theory');
    });
  });

  describe('parseTimetableFile Matrix & List Formats', () => {
    it('parses days-as-rows matrix format', () => {
      const csv = `Day, 09:00 - 10:00, 10:00 - 11:00, 11:15 - 12:15
Monday, Data Structures, Operating Systems, Mathematics
Tuesday, Database Systems, Computer Networks, Free
Wednesday, Operating Systems, Data Structures, Mathematics`;

      const result = parseTimetableFile(csv);
      expect(result.detectedCourses.length).toBe(5);
      expect(result.totalSlots).toBe(8); // 3 on Mon, 2 on Tue (Free ignored), 3 on Wed
      expect(result.detectedSlots[0].dayName).toBe('Monday');
    });

    it('parses line-by-line list format with room and faculty', () => {
      const csv = `Day, Time, Subject, Room, Faculty
Monday, 09:00 - 10:00, DSA Lab, Lab 1, Dr. Sharma
Monday, 10:00 - 11:00, OS, Room 102, Prof. Rao
Tuesday, 09:00 - 10:00, Math, Room 101, Dr. Gupta`;

      const result = parseTimetableFile(csv);
      expect(result.detectedCourses.length).toBe(3);
      expect(result.totalSlots).toBe(3);
      expect(result.detectedSlots[0].courseRawName).toBe('DSA Lab');
      expect(result.detectedSlots[0].componentType).toBe('lab');
      expect(result.detectedSlots[0].room).toBe('Lab 1');
      expect(result.detectedSlots[0].faculty).toBe('Dr. Sharma');
    });

    it('parses JSON format directly', () => {
      const json = JSON.stringify([
        { weekday: 1, start_time: '09:00', end_time: '10:00', subject: 'Cloud Computing' },
        { weekday: 2, start_time: '11:00', end_time: '12:00', subject: 'Machine Learning' },
      ]);

      const result = parseTimetableFile(json);
      expect(result.detectedCourses.length).toBe(2);
      expect(result.totalSlots).toBe(2);
    });

    it('groups theory and lab sessions into a single theory_and_lab course', () => {
      const csv = `Day, Time, Subject
Monday, 09:00 - 10:00, Data Structures
Wednesday, 14:00 - 16:00, Data Structures Lab`;

      const result = parseTimetableFile(csv);
      expect(result.detectedCourses.length).toBe(1);
      expect(result.detectedCourses[0].type).toBe('theory_and_lab');
      expect(result.detectedCourses[0].cleanName).toBe('Data Structures');
      expect(result.totalSlots).toBe(2);
      expect(result.detectedSlots[0].componentType).toBe('theory');
      expect(result.detectedSlots[0].weight).toBe(1);
      expect(result.detectedSlots[1].componentType).toBe('lab');
      expect(result.detectedSlots[1].weight).toBe(2);
    });
  });
});

