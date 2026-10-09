import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exportAttendancePdf, type AttendancePdfData } from '../pdfExport';

describe('PDF Export Engine', () => {
  afterEach(() => {
    // Clean up any test-generated PDF files in working directory
    const files = fs.readdirSync(process.cwd());
    for (const f of files) {
      if (f.startsWith('Spirit_Attendance_Report_') && f.endsWith('.pdf')) {
        try {
          fs.unlinkSync(path.join(process.cwd(), f));
        } catch {
          // ignore
        }
      }
    }
  });

  const sampleData: AttendancePdfData = {
    studentName: 'Alex Mercer',
    degreeType: 'B.Tech',
    branch: 'Computer Science',
    termName: 'Semester 5',
    startDate: '2026-08-01',
    endDate: '2026-10-09',
    grandConducted: 80,
    grandAttended: 68,
    grandAbsent: 12,
    grandMedical: 2,
    grandDutyLeave: 1,
    grandPercentage: 85.0,
    isOverallSafe: true,
    inDangerCount: 0,
    subjects: [
      {
        name: 'Database Systems',
        code: 'CS501',
        credits: 4,
        type: 'theory',
        conducted: 30,
        attended: 26,
        absent: 4,
        medical: 1,
        dutyLeave: 0,
        percentage: 86.7,
        targetThreshold: 75,
        isInDanger: false,
        safeBunks: 4,
        mustAttend: 0,
      },
      {
        name: 'Computer Networks',
        code: 'CS502',
        credits: 4,
        type: 'theory',
        conducted: 28,
        attended: 24,
        absent: 4,
        medical: 0,
        dutyLeave: 1,
        percentage: 85.7,
        targetThreshold: 75,
        isInDanger: false,
        safeBunks: 3,
        mustAttend: 0,
      },
    ],
  };

  it('generates attendance PDF document successfully in browser / node environment', async () => {
    const result = await exportAttendancePdf(sampleData);
    expect(result).toBe('downloaded');
  });
});
