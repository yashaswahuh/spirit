import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { requestStoragePermissions } from './storagePermissions';
import { formatDate } from './preferences';

export interface SubjectPdfReport {
  name: string;
  code?: string | null;
  credits: number;
  type: string;
  conducted: number;
  attended: number;
  absent: number;
  medical: number;
  dutyLeave: number;
  percentage: number;
  targetThreshold: number;
  isInDanger: boolean;
  safeBunks: number;
  mustAttend: number;
}

export interface AttendancePdfData {
  studentName: string;
  degreeType: string;
  branch: string;
  termName: string;
  startDate: string;
  endDate: string;
  grandConducted: number;
  grandAttended: number;
  grandAbsent: number;
  grandMedical: number;
  grandDutyLeave: number;
  grandPercentage: number;
  isOverallSafe: boolean;
  inDangerCount: number;
  subjects: SubjectPdfReport[];
}

/**
 * Generates an official, university-compliant PDF attendance report
 * and either saves/shares via native Android intent or downloads via browser.
 */
export async function exportAttendancePdf(data: AttendancePdfData): Promise<'shared' | 'downloaded'> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Header Banner
  doc.setFillColor(79, 70, 229); // Spirit Indigo
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SPIRIT • OFFICIAL ATTENDANCE REPORT', margin, 12);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text('Local-First Academic Record • University-Compliant Weighting', margin, 18);

  const generatedDate = formatDate(new Date());
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 18, { align: 'right' });

  // Student & Term Info Grid
  doc.setTextColor(31, 41, 55);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');

  const metaTop = 32;
  doc.text('Student:', margin, metaTop);
  doc.setFont('helvetica', 'normal');
  doc.text(data.studentName || 'Student', margin + 16, metaTop);

  doc.setFont('helvetica', 'bold');
  doc.text('Program:', margin, metaTop + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${data.degreeType || 'Degree'} - ${data.branch || 'General'}`, margin + 16, metaTop + 6);

  const rightMetaX = pageWidth / 2 + 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Semester:', rightMetaX, metaTop);
  doc.setFont('helvetica', 'normal');
  doc.text(data.termName || 'Current Semester', rightMetaX + 18, metaTop);

  doc.setFont('helvetica', 'bold');
  doc.text('Date Range:', rightMetaX, metaTop + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(data.startDate)} to ${formatDate(data.endDate)}`, rightMetaX + 18, metaTop + 6);

  // Summary Metrics Cards
  const cardsTop = 46;
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 18;

  // Card 1: Overall Percentage
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.25);
  doc.roundedRect(margin, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('OVERALL ATTENDANCE', margin + 3.5, cardsTop + 5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  if (data.grandConducted === 0) {
    doc.setTextColor(100, 116, 139);
    doc.text('—', margin + 3.5, cardsTop + 11.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('No classes held', margin + 3.5, cardsTop + 15.5);
  } else {
    const isSafe = data.isOverallSafe;
    doc.setTextColor(isSafe ? 6 : 153, isSafe ? 95 : 27, isSafe ? 70 : 27);
    doc.text(`${data.grandPercentage.toFixed(1)}%`, margin + 3.5, cardsTop + 11.5);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(
      isSafe ? '✓ SAFE' : `⚠️ ${data.inDangerCount} AT RISK`,
      margin + 3.5,
      cardsTop + 15.5
    );
  }

  // Card 2: Conducted vs Attended
  const card2X = margin + cardWidth + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card2X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('ATTENDED / HELD', card2X + 3.5, cardsTop + 5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${data.grandAttended} / ${data.grandConducted}`, card2X + 3.5, cardsTop + 11.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Attended Periods', card2X + 3.5, cardsTop + 15.5);

  // Card 3: Absences
  const card3X = card2X + cardWidth + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card3X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('TOTAL ABSENT', card3X + 3.5, cardsTop + 5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(153, 27, 27);
  doc.text(`${data.grandAbsent}`, card3X + 3.5, cardsTop + 11.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Unexcused Misses', card3X + 3.5, cardsTop + 15.5);

  // Card 4: Approved Leaves
  const card4X = card3X + cardWidth + 3;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(card4X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text('APPROVED LEAVE', card4X + 3.5, cardsTop + 5);
  doc.setFontSize(11.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(67, 56, 202);
  doc.text(`${data.grandMedical + data.grandDutyLeave}`, card4X + 3.5, cardsTop + 11.5);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Med: ${data.grandMedical}  |  OD: ${data.grandDutyLeave}`, card4X + 3.5, cardsTop + 15.5);

  // Subject Table via autoTable
  const tableData = data.subjects.map((s) => {
    const hasClasses = s.conducted > 0;
    const statusText = !hasClasses
      ? 'No Classes'
      : s.isInDanger
      ? 'At Risk'
      : 'Safe';

    const guidanceText = !hasClasses
      ? '—'
      : s.isInDanger
      ? `Must Attend ${s.mustAttend}`
      : `Can Skip ${s.safeBunks}`;

    const pctText = hasClasses ? `${s.percentage.toFixed(1)}%` : '—';

    return [
      `${s.name}\n${s.code || 'Course'} • ${s.credits} Cr • ${s.type}`,
      `${s.conducted}`,
      `${s.attended}`,
      `${s.absent}`,
      `${s.medical}/${s.dutyLeave}`,
      pctText,
      `${s.targetThreshold}%`,
      statusText,
      guidanceText,
    ];
  });

  autoTable(doc, {
    startY: cardsTop + cardHeight + 6,
    margin: { left: margin, right: margin, bottom: 20 },
    head: [
      [
        'Subject / Details',
        'Held',
        'Attd',
        'Abs',
        'Leave',
        'Pct',
        'Req',
        'Status',
        'Safe Bunk / Guidance',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      textColor: [15, 23, 42],
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50, fontStyle: 'bold', fontSize: 7.5, textColor: [15, 23, 42] },
      1: { halign: 'center', cellWidth: 12, fontSize: 8, textColor: [30, 41, 59] },
      2: { halign: 'center', cellWidth: 12, fontSize: 8, fontStyle: 'bold', textColor: [15, 23, 42] },
      3: { halign: 'center', cellWidth: 12, fontSize: 8, fontStyle: 'bold', textColor: [153, 27, 27] },
      4: { halign: 'center', cellWidth: 14, fontSize: 7.5, textColor: [51, 65, 85] },
      5: { halign: 'center', cellWidth: 16, fontSize: 8.5, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 12, fontSize: 8, textColor: [71, 85, 105] },
      7: { halign: 'center', cellWidth: 18, fontSize: 7.5, fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 36, fontSize: 7.5, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    styles: {
      cellPadding: 2.5,
      lineColor: [203, 213, 225],
      lineWidth: 0.2,
      valign: 'middle',
    },
    didParseCell: (dataCell) => {
      if (dataCell.section === 'body') {
        const rawRow = data.subjects[dataCell.row.index];
        if (!rawRow) return;

        // Column 5: Percentage
        if (dataCell.column.index === 5) {
          if (rawRow.conducted > 0) {
            dataCell.cell.styles.textColor = rawRow.isInDanger ? [153, 27, 27] : [6, 95, 70];
          } else {
            dataCell.cell.styles.textColor = [100, 116, 139];
          }
        }

        // Column 7: Status Badge
        if (dataCell.column.index === 7) {
          if (rawRow.conducted === 0) {
            dataCell.cell.styles.fillColor = [241, 245, 249];
            dataCell.cell.styles.textColor = [71, 85, 105];
          } else if (rawRow.isInDanger) {
            dataCell.cell.styles.fillColor = [254, 242, 242]; // Light rose tint
            dataCell.cell.styles.textColor = [153, 27, 27]; // Deep crimson
          } else {
            dataCell.cell.styles.fillColor = [236, 253, 245]; // Light emerald tint
            dataCell.cell.styles.textColor = [6, 95, 70]; // Deep forest green
          }
        }

        // Column 8: Guidance
        if (dataCell.column.index === 8) {
          if (rawRow.conducted === 0) {
            dataCell.cell.styles.textColor = [100, 116, 139];
          } else if (rawRow.isInDanger) {
            dataCell.cell.styles.textColor = [153, 27, 27];
          } else {
            dataCell.cell.styles.textColor = [6, 95, 70];
          }
        }
      }
    },
  });

  // Footer Note
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      'Calculated using Indian university-compliant formulas (Opening Balances + Weight-adjusted Periods).',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  const filename = `Spirit_Attendance_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  // Native Android export
  if (Capacitor.isNativePlatform()) {
    try {
      await requestStoragePermissions();

      // Output as base64 string
      const dataUri = doc.output('datauristring');
      const base64Data = dataUri.split(',')[1];

      // Save to Cache directory for secure FileProvider sharing
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
      });

      // Also save directly to Documents
      try {
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents,
        });
      } catch (docErr) {
        console.warn('Could not write copy to Documents:', docErr);
      }

      // Trigger Android native share sheet (can view, print, save to Google Drive or Files)
      await Share.share({
        title: filename,
        text: 'Spirit Academic Attendance Report',
        url: writeResult.uri,
        dialogTitle: 'Save or Share Attendance PDF',
      });

      return 'shared';
    } catch (err: any) {
      if (err?.message?.includes('canceled') || err?.message?.includes('cancelled')) {
        return 'shared';
      }
      console.error('Native PDF export failed:', err);
    }
  }

  // Web Browser fallback: Direct PDF file download
  doc.save(filename);
  return 'downloaded';
}

