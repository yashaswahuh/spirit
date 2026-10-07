import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { db, LOCAL_USER_ID } from '../../db/dexie';
import { generateUUID } from '../../utils/uuid';
import { Course, Term, TimetableVersion } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { parseTimetableFile, ParsedTimetableResult } from '../../utils/timetableParser';
import { createTimetableSlot } from '../../db/repositories/timetable.repo';

interface TimetableUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTerm: Term | null | undefined;
  existingCourses: Course[];
  activeVersion: TimetableVersion | null | undefined;
  onImportComplete?: () => void;
}

const SAMPLE_CSV = `Day, 09:00 - 09:55, 09:55 - 10:50, 11:15 - 12:10, 12:10 - 13:05, 14:00 - 15:50
Monday, Data Structures, Mathematics III, Digital Electronics, Operating Systems, Free
Tuesday, Operating Systems, Computer Networks, Database Systems, Mathematics III, DSA Lab
Wednesday, Database Systems, Data Structures, Digital Electronics, Computer Networks, Free
Thursday, Mathematics III, Operating Systems, Data Structures, Database Systems, Web Dev Lab
Friday, Computer Networks, Digital Electronics, Operating Systems, Mathematics III, Project Lab
Saturday, Data Structures, Computer Networks, Free, Free, Free`;

export const TimetableUploadModal: React.FC<TimetableUploadModalProps> = ({
  isOpen,
  onClose,
  activeTerm,
  existingCourses,
  activeVersion,
  onImportComplete,
}) => {
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ParsedTimetableResult | null>(null);
  const [replaceExistingSlots, setReplaceExistingSlots] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTextChange = (text: string) => {
    setInputText(text);
    setErrorMessage(null);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    try {
      const result = parseTimetableFile(text, existingCourses);
      setParseResult(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not parse timetable format.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = evt => {
      const content = evt.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setFileName('sample_college_timetable.csv');
    handleTextChange(SAMPLE_CSV);
  };

  const handleCourseColorChange = (index: number, newColor: string) => {
    if (!parseResult) return;
    const updatedCourses = [...parseResult.detectedCourses];
    updatedCourses[index] = { ...updatedCourses[index], color: newColor };
    setParseResult({
      ...parseResult,
      detectedCourses: updatedCourses,
    });
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.detectedSlots.length === 0 || !activeTerm) {
      return;
    }

    setIsImporting(true);
    setErrorMessage(null);

    try {
      const now = new Date().toISOString();
      const courseNameToIdMap = new Map<string, string>();

      // 1. Process courses: link existing or create new ones
      for (const detected of parseResult.detectedCourses) {
        if (detected.isExisting && detected.existingCourseId) {
          courseNameToIdMap.set(detected.rawName, detected.existingCourseId);
        } else {
          // Create new course
          const newCourseId = generateUUID();
          const newCourse: Course = {
            id: newCourseId,
            user_id: LOCAL_USER_ID,
            term_id: activeTerm.id,
            name: detected.cleanName,
            code: detected.code,
            credits: detected.type === 'lab' ? 2 : 3,
            type: detected.type,
            counts_toward_gpa: true,
            attendance_threshold_override: null,
            color: detected.color,
            medical_counts_as_present: true,
            duty_leave_counts_as_present: true,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
          await db.course.add(newCourse);
          courseNameToIdMap.set(detected.rawName, newCourseId);
        }
      }

      // 2. Optionally soft-delete existing slots for this version/term
      if (replaceExistingSlots && activeVersion) {
        const existing = await db.timetable_slot
          .where('version_id')
          .equals(activeVersion.id)
          .filter(s => s.deleted_at === null)
          .toArray();
        for (const slot of existing) {
          await db.timetable_slot.update(slot.id, {
            deleted_at: now,
            updated_at: now,
          });
        }
      }

      // 3. Create timetable slots
      for (const slot of parseResult.detectedSlots) {
        const courseId = courseNameToIdMap.get(slot.courseRawName);
        if (!courseId) continue;

        await createTimetableSlot({
          course_id: courseId,
          version_id: activeVersion?.id || null,
          weekday: slot.weekday,
          start_time: slot.startTime,
          end_time: slot.endTime,
          room: slot.room,
          faculty: slot.faculty,
          component_type: slot.componentType,
          weight: slot.weight,
          period_name: null,
        });
      }

      setImportSuccess(true);
      if (onImportComplete) onImportComplete();
      setTimeout(() => {
        setImportSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to import timetable:', err);
      setErrorMessage(err.message || 'Error saving slots to database.');
    } finally {
      setIsImporting(false);
    }
  };

  const newCoursesCount = parseResult?.detectedCourses.filter(c => !c.isExisting).length || 0;
  const existingCoursesCount = parseResult?.detectedCourses.filter(c => c.isExisting).length || 0;

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Upload & Auto-Recognize Timetable"
      description="Upload your college timetable CSV, TSV, or spreadsheet copy. Spirit will automatically extract subjects, periods, and labs in seconds."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Dropzone & File Pick */}
        <div className="p-4 sm:p-5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl bg-gray-50/60 dark:bg-gray-800/40 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div>
            <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
              Drag & drop or select timetable file
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Supports .csv, .tsv, .txt, or spreadsheet paste (Excel / Google Sheets)
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <label className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-sm">
              <span>Browse File</span>
              <input
                type="file"
                accept=".csv,.tsv,.txt,.json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleLoadSample}
              className="px-3.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Try Sample Timetable
            </button>
          </div>

          {fileName && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800">
              <FileText className="w-3.5 h-3.5" />
              {fileName}
            </div>
          )}
        </div>

        {/* Text Area for Direct Paste */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Or Paste Timetable Text Directly
            </label>
            {inputText && (
              <button
                type="button"
                onClick={() => handleTextChange('')}
                className="text-[11px] text-rose-500 hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            rows={4}
            value={inputText}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="Paste table copied from Excel, college portal, or CSV lines here..."
            className="w-full px-3.5 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auto-Recognition Live Preview */}
        {parseResult && parseResult.detectedSlots.length > 0 && (
          <div className="p-4 sm:p-5 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-3xl border border-indigo-100 dark:border-indigo-900/50 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-xs sm:text-sm font-black text-gray-900 dark:text-white">
                  Timetable Recognized Successfully
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 shadow-sm border border-indigo-100 dark:border-indigo-900">
                  {parseResult.totalSlots} Class Slots Found
                </span>
              </div>
            </div>

            {/* Courses summary */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider block">
                Subjects Detected ({parseResult.detectedCourses.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1">
                {parseResult.detectedCourses.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs shadow-xs"
                  >
                    <label
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0 cursor-pointer ring-1 ring-black/10 hover:scale-125 transition-transform relative"
                      style={{ backgroundColor: c.color }}
                      title="Click to customize subject color"
                    >
                      <input
                        type="color"
                        value={c.color}
                        onChange={e => handleCourseColorChange(i, e.target.value.toLowerCase())}
                        className="sr-only"
                        aria-label={`Change color for ${c.cleanName}`}
                      />
                    </label>
                    <span className="font-bold text-gray-900 dark:text-white">{c.cleanName}</span>
                    <span className="text-[10px] text-gray-400">({c.code})</span>
                    {c.isExisting ? (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 font-semibold">
                        Existing
                      </span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold">
                        Auto-Create
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2 pt-1">
                <span>{newCoursesCount} new subjects will be added to your semester.</span>
                {existingCoursesCount > 0 && <span>{existingCoursesCount} matched existing courses.</span>}
              </div>
            </div>

            {/* Options */}
            <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExistingSlots}
                  onChange={e => setReplaceExistingSlots(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Replace existing timetable slots instead of merging</span>
              </label>

              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {importSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Imported Successfully!
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {isImporting ? 'Importing...' : 'Import to My Timetable'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
