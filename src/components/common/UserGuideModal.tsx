import React, { useState } from 'react';
import {
  Rocket,
  Calculator,
  CalendarDays,
  GraduationCap,
  HardDriveDownload,
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type GuideTab = 'start' | 'attendance' | 'timetable' | 'grades' | 'safety' | 'sync';

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('start');

  const tabs: Array<{ id: GuideTab; label: string; icon: React.FC<{ className?: string }> }> = [
    { id: 'start', label: 'Quick Start', icon: Rocket },
    { id: 'attendance', label: 'Attendance Math', icon: Calculator },
    { id: 'timetable', label: 'Timetable & Upload', icon: CalendarDays },
    { id: 'grades', label: 'Grades & GPA', icon: GraduationCap },
    { id: 'safety', label: 'Data Safety & Backup', icon: HardDriveDownload },
    { id: 'sync', label: 'Calendar Alarms & PWA', icon: BellRing },
  ];

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="How to Use Spirit 🎓"
      description="Your complete guide to attendance formulas, schedule automation, GPA tracking, and data safety."
      maxWidth="xl"
    >
      <div className="space-y-4">
        {/* Navigation Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-gray-100 dark:border-gray-800 -mx-1 px-1">
          {tabs.map(t => {
            const Icon = t.icon;
            const isSelected = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {/* TAB 1: QUICK START */}
          {activeTab === 'start' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm">
                    100% Local-First & Private
                  </h4>
                  <p className="text-xs text-indigo-800 dark:text-indigo-300">
                    Spirit has zero logins, no external servers, and no ads. All your data lives securely in your device's browser (IndexedDB).
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Starting Your Semester
                </h4>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600 dark:text-gray-300 pl-1">
                  <li>
                    <strong className="text-gray-900 dark:text-white">Set Your Attendance Target:</strong> Enter your university's required threshold (e.g. 75% or 85%) in Settings.
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">Add Courses:</strong> Define your subjects with credit hours, lecture types (*Theory, Lab, Project, Audit*), and custom colors.
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">Mid-Semester Start (Opening Balance):</strong> Starting mid-term? Don't worry about past weeks. Open any subject &rarr; enter <em>Attended Before Tracking</em> and <em>Conducted Before Tracking</em> from your college portal.
                  </li>
                </ol>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 space-y-1.5">
                <h5 className="font-bold text-gray-900 dark:text-white text-xs">
                  Today's Attendance in 1 Tap
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  On the Home screen, today's schedule is generated automatically from your timetable. Simply tap <strong>Present</strong>, <strong>Absent</strong>, or <strong>Cancelled</strong>. Tapping an active button toggles it back to unmarked.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: ATTENDANCE MATH */}
          {activeTab === 'attendance' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    Safe Bunks
                  </div>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200">
                    How many upcoming classes you can safely skip without falling below your target threshold.
                  </p>
                  <p className="font-mono text-[11px] bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                    ⌊Attended / Target - Conducted⌋
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" />
                    Must Attend
                  </div>
                  <p className="text-xs text-rose-900 dark:text-rose-200">
                    How many consecutive classes you must attend to climb back into the safe zone if you are below threshold.
                  </p>
                  <p className="font-mono text-[11px] bg-white dark:bg-gray-900 p-1.5 rounded-lg border border-rose-100 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                    ⌈(Target × Conducted - Attended) / (1 - Target)⌉
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-500" />
                  Decision Making Tools
                </h4>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">"Can I Skip Tomorrow?" Card</strong>
                    Appears directly on the Home dashboard. Analyzes tomorrow's exact timetable slots and tells you whether skipping is safe or if attendance is required.
                  </li>
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">What-If Attendance Simulator</strong>
                    Test hypothetical absences: pick specific dates to miss, simulate skipping a recurring weekday (e.g. all Fridays), or skip N upcoming days to inspect projected percentage drops.
                  </li>
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Printable Attendance Reports</strong>
                    Generate an official PDF/print report with date filters, subject summaries, and safe bunks tables for college submissions.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: TIMETABLE & UPLOAD */}
          {activeTab === 'timetable' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  Upload & Auto-Recognize Timetable
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  You don't need to manually type each slot! Drag-and-drop or paste your timetable file (.csv, .tsv, .txt, .json) in the Timetable tab:
                </p>
                <ul className="list-disc list-inside text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
                  <li>Detects grid/matrix formats and line-by-line schedules.</li>
                  <li>Auto-extracts course codes, names, period hours, and rooms.</li>
                  <li>Lets you customize colors before importing.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                  Schedule Rules & Mid-Semester Changes
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                  <li>
                    <strong className="text-gray-900 dark:text-white">Alternate Saturdays:</strong> Configure <em>2nd Saturday Off</em>, <em>2nd & 4th Saturday Off</em>, or <em>All Saturdays Off</em> in Term Settings.
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">One-Off Date Overrides:</strong> Cancel a class, substitute a subject, or add extra lectures on a single date without touching your recurring schedule.
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">Timetable Versions:</strong> When your university updates the timetable mid-term, use "New Version &rarr; Apply from Date". Past logs remain intact!
                  </li>
                  <li>
                    <strong className="text-gray-900 dark:text-white">Swap Days:</strong> Easily follow a Friday timetable on a Wednesday when your college reschedules working days.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: GRADES & GPA */}
          {activeTab === 'grades' && (
            <div className="space-y-3.5">
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  Assessment Components & Weightages
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Configure assessment structures for every course: Mid-Semesters, Quizzes, Assignments, Lab Internals, and End-Sem exams.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Normal</strong>
                    Direct percentage weightage towards total internal/external marks.
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Best of N</strong>
                    Takes the highest N scores (e.g. Best 2 out of 3 Mid-Sems).
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Drop Lowest</strong>
                    Automatically removes the worst quiz or assignment score.
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 space-y-1.5">
                <h5 className="font-bold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-amber-600" />
                  Target End-Sem Score Solver
                </h5>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Wondering what score you need on the final exam for an 'A' grade? Open <strong>Required Marks Solver</strong> to find the exact minimum score needed based on your current internal marks.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs space-y-1">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Starting the Next Semester
                </span>
                <p className="text-gray-500 dark:text-gray-400">
                  When final grades are out, open the Semester Switcher and tap <strong>Start Next Semester</strong>. Spirit archives completed terms into your cumulative CGPA history.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: DATA SAFETY & BACKUP */}
          {activeTab === 'safety' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 space-y-1.5">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  Request Persistent Storage
                </div>
                <p className="text-xs text-emerald-900 dark:text-emerald-200">
                  Head to <strong>Settings & More &rarr; Storage Safety</strong> and tap <em>Request Persistent Storage</em>. This tells your browser not to clear Spirit's database even if device storage runs low.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                  Backup & Restore (JSON & CSV)
                </h4>
                <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Full JSON Export:</strong>
                    Saves your complete academic history in a single file. Send it to Google Drive, iCloud, or WhatsApp.
                  </li>
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Smart Merge vs Replace:</strong>
                    When importing a backup, choose <em>Smart Merge</em> (newer timestamps win safely) or <em>Clean Replace</em>.
                  </li>
                  <li className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block">Daily & Weekly Backup Reminders:</strong>
                    Enable backup reminders in Settings. Spirit will display a reminder banner after your chosen interval so you never lose data.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 6: CALENDAR ALARMS & PWA */}
          {activeTab === 'sync' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <h4 className="font-bold text-indigo-950 dark:text-indigo-200 text-xs sm:text-sm flex items-center gap-1.5">
                  <BellRing className="w-4 h-4 text-indigo-600" />
                  Phone Calendar Alarms (.ics Export)
                </h4>
                <p className="text-xs text-indigo-800 dark:text-indigo-300">
                  Because Spirit has no cloud servers, it cannot wake your device with push notifications when closed. Instead, Spirit exports standard RFC 5545 `.ics` calendar files with native alarms:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-indigo-950 dark:text-indigo-100 pt-1">
                  <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900">
                    <strong>Timetable (.ics):</strong> Recurring weekly classes with 15-minute alarms.
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-indigo-100 dark:border-indigo-900">
                    <strong>Exams & Tasks (.ics):</strong> Due dates with 1-day and 2-hour alarms.
                  </div>
                </div>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-300 pt-1">
                  Open the exported file in Google Calendar, Apple Calendar, or Outlook for native device ringtones and alarms!
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 dark:text-white text-xs">
                  Install Spirit as a Home Screen App
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block mb-0.5">Android & Chrome:</strong>
                    Tap the <em>Install Spirit</em> banner in Settings or select <em>Install App</em> from your browser menu.
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700">
                    <strong className="text-gray-900 dark:text-white block mb-0.5">iPhone & Safari:</strong>
                    Tap the Share button &rarr; Scroll down &rarr; Tap <em>Add to Home Screen</em>.
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="text-[11px] text-gray-400 font-medium">
            Spirit v0.1.0 • 100% Local-First
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm"
          >
            Got it, Let's Track!
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
