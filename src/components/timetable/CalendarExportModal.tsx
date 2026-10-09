import React, { useState } from 'react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  Calendar,
  Globe,
  Share2,
  Download,
  Loader2,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  generateTimetableIcs,
  generateTasksIcs,
  openInCalendarApp,
  openGoogleCalendarImport,
  shareIcsFile,
  downloadIcsFile,
} from '../../utils/ics';
import type { Term, TimetableSlot, Course, Task, CalendarEvent } from '../../types';

export interface CalendarExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportType: 'timetable' | 'tasks';
  term?: Term | null;
  slots?: TimetableSlot[];
  courses?: Course[];
  tasks?: Task[];
  calendarEvents?: CalendarEvent[];
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  isOpen,
  onClose,
  exportType,
  term,
  slots = [],
  courses = [],
  tasks = [],
  calendarEvents = [],
}) => {
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getIcsData = (): { filename: string; icsContent: string } | null => {
    if (exportType === 'timetable') {
      if (!term) return null;
      const termName = term.name || 'Semester';
      const filename = `Spirit_Timetable_${termName.replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
      const icsContent = generateTimetableIcs({
        term,
        slots,
        courses,
        calendarEvents,
      });
      return { filename, icsContent };
    } else {
      const todayStr = new Date().toISOString().slice(0, 10);
      const filename = `Spirit_Exams_Deadlines_${todayStr}.ics`;
      const icsContent = generateTasksIcs({
        tasks,
        courses,
      });
      return { filename, icsContent };
    }
  };

  const handleAction = async (action: 'app' | 'google' | 'share' | 'download') => {
    const data = getIcsData();
    if (!data) {
      setErrorMessage('No active semester or data found to export.');
      return;
    }

    try {
      setExecutingAction(action);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (action === 'app') {
        await openInCalendarApp(data.filename, data.icsContent);
        setSuccessMessage('Opened in Calendar application');
      } else if (action === 'google') {
        await openGoogleCalendarImport(data.filename, data.icsContent);
        setSuccessMessage('File downloaded & Google Calendar opened');
      } else if (action === 'share') {
        await shareIcsFile(data.filename, data.icsContent);
        setSuccessMessage('Share sheet opened');
      } else if (action === 'download') {
        await downloadIcsFile(data.filename, data.icsContent);
        setSuccessMessage('Calendar .ics file downloaded');
      }

      setTimeout(() => {
        onClose();
        setSuccessMessage(null);
        setExecutingAction(null);
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to complete calendar export');
      setExecutingAction(null);
    }
  };

  const isTimetable = exportType === 'timetable';
  const title = isTimetable ? 'Export Timetable to Calendar' : 'Export Exams & Tasks to Calendar';

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description="Choose how you'd like to sync and open your schedule"
      maxWidth="md"
    >
      <div className="space-y-4 pt-1">
        {successMessage && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs font-semibold text-rose-800 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2.5">
          {/* Option 1: Open in Calendar App (Direct Import) */}
          <button
            type="button"
            onClick={() => handleAction('app')}
            disabled={executingAction !== null}
            className="w-full text-left p-3.5 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              {executingAction === 'app' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Calendar className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  Open in Calendar App
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white shrink-0">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Directly open or import with Google Calendar, Samsung Calendar, or Apple Calendar on your device.
              </p>
            </div>
          </button>

          {/* Option 2: Google Calendar Web Import */}
          <button
            type="button"
            onClick={() => handleAction('google')}
            disabled={executingAction !== null}
            className="w-full text-left p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {executingAction === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Globe className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900 dark:text-white">
                  Import into Google Calendar Web
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  Web / Browser
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Downloads the .ics file and opens Google Calendar's import page in your browser.
              </p>
            </div>
          </button>

          {/* Option 3: Share sheet */}
          <button
            type="button"
            onClick={() => handleAction('share')}
            disabled={executingAction !== null}
            className="w-full text-left p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {executingAction === 'share' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Share2 className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-gray-900 dark:text-white block">
                Share .ics File
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Send file via WhatsApp, Telegram, Google Drive, or Email to share with classmates.
              </p>
            </div>
          </button>

          {/* Option 4: Download directly */}
          <button
            type="button"
            onClick={() => handleAction('download')}
            disabled={executingAction !== null}
            className="w-full text-left p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all flex items-start gap-3.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {executingAction === 'download' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-bold text-sm text-gray-900 dark:text-white block">
                Download .ics File
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Save the file directly to your phone or computer storage.
              </p>
            </div>
          </button>
        </div>

        {/* Informational badge */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/80 flex items-start gap-2.5">
          <CalendarDays className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {isTimetable
              ? 'Recurring timetable slots automatically repeat each week through semester end, excluding university holidays and off-Saturdays.'
              : 'Tasks and exams include reminders scheduled 1 day and 2 hours in advance.'}
          </p>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
