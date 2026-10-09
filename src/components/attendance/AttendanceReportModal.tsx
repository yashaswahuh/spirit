import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Printer, CheckCircle2, AlertTriangle, Filter, FileDown, Loader2 } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { db } from '../../db/dexie';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { computeCourseAttendanceStats } from '../../engine/attendance';
import { getLabAttendanceRule } from '../../utils/preferences';
import { exportAttendancePdf } from '../../utils/pdfExport';

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AttendanceReportModal: React.FC<AttendanceReportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];

  const todayStr = new Date().toISOString().slice(0, 10);

  // Compute earliest boundary across active term start, recorded logs, and course tracking dates
  const earliestDataDate = useMemo(() => {
    let earliest = activeTerm?.start_date || '';
    for (const r of records) {
      if (r.date && (!earliest || r.date < earliest)) {
        earliest = r.date;
      }
    }
    for (const c of courses) {
      if (c.tracking_start_date && (!earliest || c.tracking_start_date < earliest)) {
        earliest = c.tracking_start_date;
      }
    }
    return earliest || todayStr;
  }, [activeTerm?.start_date, records, courses, todayStr]);

  const [isCustomDate, setIsCustomDate] = useState(false);
  const [activePreset, setActivePreset] = useState<'all' | 'month' | '30days' | '7days' | 'custom'>('all');
  const [startDate, setStartDate] = useState(earliestDataDate);
  const [endDate, setEndDate] = useState(todayStr);
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);

  // Update selectedCourseIds default to all courses when courses load
  React.useEffect(() => {
    if (courses.length > 0 && selectedCourseIds.length === 0) {
      setSelectedCourseIds(courses.map(c => c.id));
    }
  }, [courses]);

  // When earliestDataDate or activeTerm resolves, keep default full range synced if user hasn't customized
  React.useEffect(() => {
    if (!isCustomDate && earliestDataDate) {
      setStartDate(earliestDataDate);
      setEndDate(todayStr);
    }
  }, [earliestDataDate, isCustomDate, todayStr, isOpen]);

  const handleSelectPreset = (preset: 'all' | 'month' | '30days' | '7days') => {
    setActivePreset(preset);
    if (preset === 'all') {
      setIsCustomDate(false);
      setStartDate(earliestDataDate);
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setIsCustomDate(true);
      setStartDate(`${todayStr.slice(0, 7)}-01`);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      setIsCustomDate(true);
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === '7days') {
      setIsCustomDate(true);
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().slice(0, 10));
      setEndDate(todayStr);
    }
  };

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      setSelectedCourseIds(selectedCourseIds.filter(id => id !== courseId));
    } else {
      setSelectedCourseIds([...selectedCourseIds, courseId]);
    }
  };

  const selectAll = () => setSelectedCourseIds(courses.map(c => c.id));
  const deselectAll = () => setSelectedCourseIds([]);

  // Filter records by date range and selected courses
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;
      if (!selectedCourseIds.includes(r.course_id)) return false;
      return true;
    });
  }, [records, startDate, endDate, selectedCourseIds]);

  const defaultThreshold = profile?.default_attendance_threshold || 75;

  // Whether opening balances should be included (full range or starts on/before earliest date)
  const shouldIncludeInitialBalance = useMemo(() => {
    if (!isCustomDate || activePreset === 'all') return true;
    if (!startDate) return true;
    if (earliestDataDate && startDate <= earliestDataDate) return true;
    if (activeTerm?.start_date && startDate <= activeTerm.start_date) return true;
    return false;
  }, [isCustomDate, activePreset, startDate, earliestDataDate, activeTerm?.start_date]);

  // Calculate stats for each selected course
  const reportData = useMemo(() => {
    const selectedCourses = courses.filter(c => selectedCourseIds.includes(c.id));

    let grandAttended = 0;
    let grandConducted = 0;
    let grandAbsent = 0;
    let grandMedical = 0;
    let grandDutyLeave = 0;
    let inDangerCount = 0;

    const subjectReports = selectedCourses.map(course => {
      const courseRecords = filteredRecords.filter(r => r.course_id === course.id);
      const courseInitialIncluded = shouldIncludeInitialBalance ||
        (Boolean(course.tracking_start_date) && startDate <= (course.tracking_start_date || ''));

      const stats = computeCourseAttendanceStats(
        courseRecords,
        {
          medical_counts_as_present: course.medical_counts_as_present,
          duty_leave_counts_as_present: course.duty_leave_counts_as_present,
        },
        course.attendance_threshold_override || defaultThreshold,
        {
          initialAttended: courseInitialIncluded ? (course.initial_attended || 0) : 0,
          initialConducted: courseInitialIncluded ? (course.initial_conducted || 0) : 0,
          trackingStartDate: course.tracking_start_date,
          slots,
          courseType: course.type,
          labAttendanceRule: course.lab_attendance_rule,
          globalLabRule: getLabAttendanceRule(),
        }
      );

      const presentCount = courseRecords.filter(r => r.status === 'present').length;
      const absentCount = courseRecords.filter(r => r.status === 'absent').length;
      const medicalCount = courseRecords.filter(r => r.status === 'medical').length;
      const dutyLeaveCount = courseRecords.filter(r => r.status === 'duty_leave').length;

      grandAttended += stats.attended;
      grandConducted += stats.conducted;
      grandAbsent += absentCount;
      grandMedical += medicalCount;
      grandDutyLeave += dutyLeaveCount;
      if (stats.conducted > 0 && stats.is_in_danger) inDangerCount++;

      return {
        course,
        stats,
        presentCount,
        absentCount,
        medicalCount,
        dutyLeaveCount,
      };
    });

    const grandPercentage = grandConducted > 0 ? (grandAttended / grandConducted) * 100 : 0;
    const isOverallSafe = grandConducted > 0 ? grandPercentage >= defaultThreshold : true;

    return {
      subjectReports,
      grandAttended,
      grandConducted,
      grandAbsent,
      grandMedical,
      grandDutyLeave,
      grandPercentage,
      isOverallSafe,
      inDangerCount,
    };
  }, [courses, selectedCourseIds, filteredRecords, defaultThreshold, shouldIncludeInitialBalance, startDate, slots]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      await exportAttendancePdf({
        studentName: profile?.name || 'Student',
        degreeType: program?.degree_type || 'Degree',
        branch: program?.branch_department || 'Branch',
        termName: activeTerm?.name || 'Current Term',
        startDate,
        endDate,
        grandConducted: reportData.grandConducted,
        grandAttended: reportData.grandAttended,
        grandAbsent: reportData.grandAbsent,
        grandMedical: reportData.grandMedical,
        grandDutyLeave: reportData.grandDutyLeave,
        grandPercentage: reportData.grandPercentage,
        isOverallSafe: reportData.isOverallSafe,
        inDangerCount: reportData.inDangerCount,
        subjects: reportData.subjectReports.map(sr => ({
          name: sr.course.name,
          code: sr.course.code,
          credits: sr.course.credits,
          type: sr.course.type,
          conducted: sr.stats.conducted,
          attended: sr.stats.attended,
          absent: sr.absentCount,
          medical: sr.medicalCount,
          dutyLeave: sr.dutyLeaveCount,
          percentage: sr.stats.percentage,
          targetThreshold: sr.course.attendance_threshold_override || defaultThreshold,
          isInDanger: sr.stats.is_in_danger,
          safeBunks: sr.stats.safe_bunks,
          mustAttend: sr.stats.must_attend,
        })),
      });
    } catch (err: any) {
      alert(`PDF export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    // On native mobile platforms, window.print() is unsupported by Android WebView.
    // Seamlessly forward to the native PDF generator and share sheet.
    if (Capacitor.isNativePlatform()) {
      handleExportPdf();
      return;
    }

    // Generate isolated print document in hidden iframe to guarantee no viewport clipping, no scrollbars, and full table visibility
    const printFrame = document.createElement('iframe');
    printFrame.setAttribute('aria-hidden', 'true');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) return;

    const studentName = profile?.name || 'Student';
    const batchStr = program?.start_year ? `Batch ${program.start_year}–${program.start_year + (program.duration_years || 4)}` : '';
    const programStr = `${program?.degree_type || 'Degree'} (${program?.branch_department || 'Branch'})${batchStr ? ` • ${batchStr}` : ''}`;
    const termStr = `${activeTerm?.name || 'Current Term'} | ${startDate} to ${endDate}`;
    const generatedDate = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    const rowsHtml = reportData.subjectReports.length === 0
      ? `<tr><td colspan="9" style="text-align:center; padding: 24px; color: #6b7280;">No subjects selected or no records found in the specified date range.</td></tr>`
      : reportData.subjectReports.map(({ course, stats, absentCount, medicalCount, dutyLeaveCount }) => {
          const reqThreshold = course.attendance_threshold_override || defaultThreshold;
          const hasClasses = stats.conducted > 0;
          const statusBadge = !hasClasses
            ? `<span class="badge" style="background-color: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;">No Classes</span>`
            : stats.is_in_danger
            ? `<span class="badge badge-risk">⚠️ At Risk</span>`
            : `<span class="badge badge-safe">✓ Safe</span>`;
          const guidanceText = !hasClasses
            ? `<span style="color: #9ca3af;">No classes held</span>`
            : stats.is_in_danger
            ? `<span style="color: #dc2626; font-weight: bold;">Must Attend ${stats.must_attend}</span>`
            : `<span style="color: #059669; font-weight: 600;">Can Skip ${stats.safe_bunks}</span>`;
          const pctColor = !hasClasses ? '#6b7280' : stats.is_in_danger ? '#dc2626' : '#059669';
          const pctText = hasClasses ? `${stats.percentage.toFixed(1)}%` : '—';

          return `
            <tr>
              <td style="text-align: left;">
                <div style="font-weight: 700; color: #111827;">${course.name}</div>
                <div style="font-size: 10px; color: #6b7280;">${course.code || 'Course'} • ${course.credits} Credits • ${course.type}</div>
              </td>
              <td style="text-align: center;">${stats.conducted}</td>
              <td style="text-align: center; font-weight: 600; color: #111827;">${stats.attended}</td>
              <td style="text-align: center; color: #dc2626; font-weight: 600;">${absentCount}</td>
              <td style="text-align: center; color: #4b5563;">${medicalCount}/${dutyLeaveCount}</td>
              <td style="text-align: center; font-weight: 800; color: ${pctColor};">
                ${pctText}
              </td>
              <td style="text-align: center; color: #4b5563;">${reqThreshold}%</td>
              <td style="text-align: center;">${statusBadge}</td>
              <td style="text-align: right;">${guidanceText}</td>
            </tr>
          `;
        }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Spirit Attendance Report - ${studentName}</title>
        <style>
          @page {
            size: portrait;
            margin: 12mm 10mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 10px;
            font-size: 12px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            border-bottom: 2px solid #111827;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .title {
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -0.5px;
            margin: 0;
            color: #111827;
          }
          .subtitle {
            font-size: 11px;
            color: #6b7280;
            margin-top: 2px;
          }
          .meta-info {
            text-align: right;
            font-size: 11px;
            color: #374151;
            line-height: 1.4;
          }
          .meta-info strong {
            color: #111827;
          }
          .cards-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 18px;
          }
          .card {
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
            border-radius: 8px;
            padding: 10px 12px;
          }
          .card-label {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #6b7280;
            margin-bottom: 4px;
            display: block;
          }
          .card-value {
            font-size: 18px;
            font-weight: 800;
            color: #111827;
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 4px;
          }
          .card-sub {
            font-size: 9px;
            color: #9ca3af;
            margin-top: 2px;
          }
          .badge {
            display: inline-block;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 7px;
            border-radius: 9999px;
            white-space: nowrap;
          }
          .badge-safe {
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .badge-risk {
            background-color: #fef2f2;
            color: #991b1b;
            border: 1px solid #fecaca;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 18px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
          }
          th {
            background-color: #f3f4f6;
            color: #374151;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.05em;
            padding: 8px 6px;
            border: 1px solid #d1d5db;
          }
          td {
            padding: 7px 6px;
            border: 1px solid #e5e7eb;
            vertical-align: middle;
          }
          tbody tr:nth-child(even) td {
            background-color: #f9fafb;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 10px;
            font-size: 10px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">Official Attendance Report</h1>
            <div class="subtitle">Generated via Spirit • Local-First Academic Management</div>
          </div>
          <div class="meta-info">
            <div><strong>Student:</strong> ${studentName}</div>
            <div><strong>Program:</strong> ${programStr}</div>
            <div><strong>Term:</strong> ${termStr}</div>
          </div>
        </div>

        <div class="cards-grid">
          <div class="card">
            <span class="card-label">Overall Attendance</span>
            <div class="card-value">
              <span>${reportData.grandConducted > 0 ? `${reportData.grandPercentage.toFixed(1)}%` : '—'}</span>
              ${reportData.grandConducted === 0
                ? `<span class="badge" style="background-color: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb;">No Classes</span>`
                : reportData.isOverallSafe
                ? `<span class="badge badge-safe">✓ Safe</span>`
                : `<span class="badge badge-risk">⚠️ Detention Risk</span>`}
            </div>
            <div class="card-sub">${reportData.grandConducted === 0 ? 'No attendance records logged yet' : reportData.inDangerCount > 0 ? `${reportData.inDangerCount} subject(s) at risk` : 'All subjects safe'}</div>
          </div>

          <div class="card">
            <span class="card-label">Conducted vs Attended</span>
            <div class="card-value">${reportData.grandAttended} / ${reportData.grandConducted}</div>
            <div class="card-sub">Total Period Units</div>
          </div>

          <div class="card">
            <span class="card-label">Absences Logged</span>
            <div class="card-value" style="color: #dc2626;">${reportData.grandAbsent}</div>
            <div class="card-sub">Total Unexcused Misses</div>
          </div>

          <div class="card">
            <span class="card-label">Approved Leaves</span>
            <div class="card-value">${reportData.grandMedical + reportData.grandDutyLeave}</div>
            <div class="card-sub">Medical: ${reportData.grandMedical} | OD: ${reportData.grandDutyLeave}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; width: 26%;">Subject / Code</th>
              <th style="text-align: center; width: 9%;">Conducted</th>
              <th style="text-align: center; width: 9%;">Attended</th>
              <th style="text-align: center; width: 8%;">Absent</th>
              <th style="text-align: center; width: 10%;">Leave (Med/OD)</th>
              <th style="text-align: center; width: 10%;">Percentage</th>
              <th style="text-align: center; width: 8%;">Target</th>
              <th style="text-align: center; width: 10%;">Status</th>
              <th style="text-align: right; width: 10%;">Guidance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Calculated using university-compliant attendance formulas (Opening Balances + Weight-adjusted Periods).</span>
          <span>Generated on ${generatedDate}</span>
        </div>
      </body>
      </html>
    `;

    doc.open();
    doc.write(htmlContent);
    doc.close();

    // Trigger print
    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      // Cleanup iframe after print dialog interaction
      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch {
          // ignore if already removed
        }
      }, 2000);
    }, 250);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Attendance Report"
      maxWidth="4xl"
    >
      <div className="space-y-6">
        {/* Controls - Hidden on print */}
        <div className="print:hidden bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-200 dark:border-gray-700/80 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-indigo-600" /> Report Filters & Options
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                {isExportingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Exporting PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="w-4 h-4" /> Export PDF
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 font-semibold rounded-xl text-xs items-center gap-1.5 shadow-xs transition-all"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
            </div>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mr-1">Range:</span>
            {[
              { id: 'all', label: 'All Term' },
              { id: 'month', label: 'This Month' },
              { id: '30days', label: 'Last 30 Days' },
              { id: '7days', label: 'Last 7 Days' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                  activePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date Range Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setIsCustomDate(true);
                  setActivePreset('custom');
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setIsCustomDate(true);
                  setActivePreset('custom');
                }}
                className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Subject Selection Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-gray-600 dark:text-gray-400">
                Subjects Included ({selectedCourseIds.length}/{courses.length})
              </label>
              <div className="text-[10px] space-x-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  Select All
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-gray-500 dark:text-gray-400 hover:underline font-semibold"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {courses.map(course => {
                const isSelected = selectedCourseIds.includes(course.id);
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleCourse(course.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300'
                        : 'bg-white border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {course.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Printable Document Area */}
        <div id="attendance-report-document" className="print:m-0 print:p-0 space-y-6">
          {/* Header */}
          <div className="border-b-2 border-gray-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 dark:text-white print:text-black">
                Official Attendance Report
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 print:text-gray-600 mt-0.5">
                Generated via Spirit • Local-First Academic Management
              </p>
            </div>
            <div className="text-left sm:text-right text-xs text-gray-600 dark:text-gray-400 print:text-gray-700 space-y-0.5">
              <p><span className="font-semibold">Student:</span> {profile?.name || 'Student'}</p>
              <p><span className="font-semibold">Program:</span> {program?.degree_type || 'Degree'} ({program?.branch_department || 'Branch'}){program?.start_year ? ` • Batch ${program.start_year}–${program.start_year + (program.duration_years || 4)}` : ''}</p>
              <p><span className="font-semibold">Term:</span> {activeTerm?.name || 'Current Term'} | {startDate} to {endDate}</p>
            </div>
          </div>

          {/* Overall Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 print:border-gray-300 print:bg-gray-50 min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block truncate">Overall Attendance</span>
              <div className="flex items-center justify-between gap-1.5 flex-wrap mt-1">
                <span className="text-2xl font-black text-gray-900 dark:text-white print:text-black">
                  {reportData.grandConducted > 0 ? `${reportData.grandPercentage.toFixed(1)}%` : '—'}
                </span>
                {reportData.grandConducted === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                    No Classes
                  </span>
                ) : (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    reportData.isOverallSafe ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                  }`}>
                    {reportData.isOverallSafe ? (
                      <><CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" /> Safe</>
                    ) : (
                      <><AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" /> At Risk</>
                    )}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-gray-400 block mt-0.5 truncate">
                {reportData.grandConducted === 0
                  ? 'No attendance records in range'
                  : reportData.inDangerCount > 0
                  ? `${reportData.inDangerCount} subject(s) at risk`
                  : 'All subjects safe'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 print:border-gray-300 print:bg-gray-50 min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block truncate">Conducted vs Attended</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white print:text-black mt-1">
                {reportData.grandAttended} / {reportData.grandConducted}
              </div>
              <span className="text-[10px] text-gray-400">Total Period Units</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 print:border-gray-300 print:bg-gray-50 min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block truncate">Absences Logged</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white print:text-black mt-1">
                {reportData.grandAbsent}
              </div>
              <span className="text-[10px] text-gray-400">Total Unexcused Misses</span>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 print:border-gray-300 print:bg-gray-50 min-w-0">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block truncate">Approved Leaves</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white print:text-black mt-1">
                {reportData.grandMedical + reportData.grandDutyLeave}
              </div>
              <span className="text-[10px] text-gray-400 truncate block">Med: {reportData.grandMedical} | OD: {reportData.grandDutyLeave}</span>
            </div>
          </div>

          {/* Detailed Per-Subject Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-800 print:border-gray-400 print:overflow-visible">
            <table className="w-full text-left text-xs border-collapse min-w-[620px] print:min-w-0">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800/80 print:bg-gray-100 text-gray-700 dark:text-gray-300 print:text-black font-bold uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-gray-700 print:border-gray-400">
                  <th className="py-2.5 px-3">Subject / Code</th>
                  <th className="py-2.5 px-2 text-center">Conducted</th>
                  <th className="py-2.5 px-2 text-center">Attended</th>
                  <th className="py-2.5 px-2 text-center">Absent</th>
                  <th className="py-2.5 px-2 text-center">Leave (Med/OD)</th>
                  <th className="py-2.5 px-2 text-center">Percentage</th>
                  <th className="py-2.5 px-2 text-center">Target</th>
                  <th className="py-2.5 px-2 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Guidance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800 print:divide-gray-300">
                {reportData.subjectReports.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-400">
                      No subjects selected or no records found in the specified date range.
                    </td>
                  </tr>
                ) : (
                  reportData.subjectReports.map(({ course, stats, absentCount, medicalCount, dutyLeaveCount }) => {
                    const reqThreshold = course.attendance_threshold_override || defaultThreshold;
                    const hasClasses = stats.conducted > 0;
                    return (
                      <tr key={course.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 print:hover:bg-transparent">
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-900 dark:text-white print:text-black block">
                            {course.name}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            {course.code || 'Course'} • {course.credits} Credits • {course.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center font-medium">{stats.conducted}</td>
                        <td className="py-2.5 px-2 text-center font-semibold text-gray-900 dark:text-white print:text-black">{stats.attended}</td>
                        <td className="py-2.5 px-2 text-center text-rose-600 font-medium">{absentCount}</td>
                        <td className="py-2.5 px-2 text-center text-gray-500">{medicalCount}/{dutyLeaveCount}</td>
                        <td className="py-2.5 px-2 text-center font-black">
                          {hasClasses ? (
                            <span className={stats.is_in_danger ? 'text-rose-600' : 'text-emerald-600'}>
                              {stats.percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500 font-semibold">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center text-gray-500 font-medium">{reqThreshold}%</td>
                        <td className="py-2.5 px-2 text-center">
                          {!hasClasses ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                              No Classes
                            </span>
                          ) : stats.is_in_danger ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> At Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Safe
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium">
                          {!hasClasses ? (
                            <span className="text-gray-400 dark:text-gray-500 text-xs font-normal">No classes held</span>
                          ) : stats.is_in_danger ? (
                            <span className="text-rose-600 font-bold">Must Attend {stats.must_attend}</span>
                          ) : (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Can Skip {stats.safe_bunks}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Notes for Print */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800 text-[10px] text-gray-500 print:text-gray-600 flex justify-between items-center">
            <span>Calculated using university-compliant attendance formulas (Opening Balances + Weight-adjusted Periods).</span>
            <span>Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
