import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { requestStoragePermissions } from './storagePermissions';

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

  const generatedDate = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
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
  doc.text(`${data.startDate} to ${data.endDate}`, rightMetaX + 18, metaTop + 6);

  // Summary Metrics Cards
  const cardsTop = 46;
  const cardWidth = (pageWidth - margin * 2 - 9) / 4;
  const cardHeight = 16;

  // Card 1: Overall Percentage
  doc.setFillColor(249, 250, 251);
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(margin, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.text('OVERALL ATTENDANCE', margin + 3, cardsTop + 4.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  if (data.grandConducted === 0) {
    doc.setTextColor(156, 163, 175);
    doc.text('—', margin + 3, cardsTop + 11.5);
  } else {
    doc.setTextColor(data.isOverallSafe ? 5 : 220, data.isOverallSafe ? 150 : 38, data.isOverallSafe ? 105 : 38);
    doc.text(`${data.grandPercentage.toFixed(1)}%`, margin + 3, cardsTop + 11.5);
  }

  // Card 2: Conducted vs Attended
  const card2X = margin + cardWidth + 3;
  doc.roundedRect(card2X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('ATTENDED / HELD', card2X + 3, cardsTop + 4.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(17, 24, 39);
  doc.text(`${data.grandAttended} / ${data.grandConducted}`, card2X + 3, cardsTop + 11.5);

  // Card 3: Absences
  const card3X = card2X + cardWidth + 3;
  doc.roundedRect(card3X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('TOTAL ABSENT', card3X + 3, cardsTop + 4.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`${data.grandAbsent}`, card3X + 3, cardsTop + 11.5);

  // Card 4: Approved Leaves
  const card4X = card3X + cardWidth + 3;
  doc.roundedRect(card4X, cardsTop, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(7);
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.text('APPROVED LEAVE', card4X + 3, cardsTop + 4.5);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(79, 70, 229);
  doc.text(`${data.grandMedical + data.grandDutyLeave} (M:${data.grandMedical} OD:${data.grandDutyLeave})`, card4X + 3, cardsTop + 11.5);

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
      fillColor: [31, 41, 55],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 50, fontStyle: 'bold', fontSize: 7.5 },
      1: { halign: 'center', cellWidth: 12, fontSize: 8 },
      2: { halign: 'center', cellWidth: 12, fontSize: 8 },
      3: { halign: 'center', cellWidth: 12, fontSize: 8, textColor: [220, 38, 38] },
      4: { halign: 'center', cellWidth: 14, fontSize: 7.5 },
      5: { halign: 'center', cellWidth: 16, fontSize: 8.5, fontStyle: 'bold' },
      6: { halign: 'center', cellWidth: 12, fontSize: 8 },
      7: { halign: 'center', cellWidth: 18, fontSize: 7.5, fontStyle: 'bold' },
      8: { halign: 'right', cellWidth: 36, fontSize: 7.5, fontStyle: 'bold' },
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251],
    },
    styles: {
      cellPadding: 2.5,
      lineColor: [229, 231, 235],
      lineWidth: 0.15,
      valign: 'middle',
    },
    didParseCell: (dataCell) => {
      // Color-code the percentage and status cells
      if (dataCell.section === 'body') {
        const rawRow = data.subjects[dataCell.row.index];
        if (!rawRow || rawRow.conducted === 0) return;

        if (dataCell.column.index === 5 || dataCell.column.index === 7) {
          if (rawRow.isInDanger) {
            dataCell.cell.styles.textColor = [220, 38, 38]; // Red
          } else {
            dataCell.cell.styles.textColor = [5, 150, 105]; // Green
          }
        }
        if (dataCell.column.index === 8) {
          if (rawRow.isInDanger) {
            dataCell.cell.styles.textColor = [220, 38, 38];
          } else {
            dataCell.cell.styles.textColor = [5, 150, 105];
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
    doc.setTextColor(156, 163, 175);
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
