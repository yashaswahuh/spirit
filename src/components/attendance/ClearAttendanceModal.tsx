import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { RotateCcw, AlertTriangle, CheckCircle2, RefreshCw, Calendar, BookOpen } from 'lucide-react';
import { db } from '../../db/dexie';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { clearAttendanceRecords, countAttendanceRecordsToClear } from '../../db/repositories/attendance.repo';

interface ClearAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCleared?: (result: { deletedCount: number; resetCoursesCount: number }) => void;
  initialCourseId?: string | null;
}

export const ClearAttendanceModal: React.FC<ClearAttendanceModalProps> = ({
  isOpen,
  onClose,
  onCleared,
  initialCourseId = null,
}) => {
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());

  const todayStr = new Date().toISOString().slice(0, 10);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourseId || 'all');
  const [isDateFilterEnabled, setIsDateFilterEnabled] = useState(false);
  const [startDate, setStartDate] = useState(activeTerm?.start_date || todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [resetOpeningBalances, setResetOpeningBalances] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ deletedCount: number; resetCoursesCount: number } | null>(null);

  // Live count of matching records to be cleared
  const targetCourseId = selectedCourseId === 'all' ? null : selectedCourseId;
  const targetStartDate = isDateFilterEnabled ? startDate : null;
  const targetEndDate = isDateFilterEnabled ? endDate : null;

  const matchingCount = useLiveQuery(
    () => countAttendanceRecordsToClear({
      courseId: targetCourseId,
      startDate: targetStartDate,
      endDate: targetEndDate,
    }),
    [targetCourseId, targetStartDate, targetEndDate]
  );

  const totalRecordsToClear = matchingCount ?? 0;
  const selectedCourse = courses.find(c => c.id === targetCourseId);

  const handleClear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalRecordsToClear === 0 && !resetOpeningBalances) return;

    try {
      setIsClearing(true);
      const result = await clearAttendanceRecords({
        courseId: targetCourseId,
        startDate: targetStartDate,
        endDate: targetEndDate,
        resetOpeningBalances,
      });

      setSuccessInfo(result);
      onCleared?.(result);

      // Auto close after brief success confirmation
      setTimeout(() => {
        setSuccessInfo(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      alert(`Failed to clear attendance records: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Clear Logged Attendance Data"
      maxWidth="md"
    >
      {successInfo ? (
        <div className="py-8 text-center space-y-3 animate-fade-in">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Attendance Logs Cleared Successfully
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Removed {successInfo.deletedCount} attendance record(s)
            {successInfo.resetCoursesCount > 0 && ` and reset opening balances on ${successInfo.resetCoursesCount} subject(s)`}.
            Your subjects and timetable are preserved.
          </p>
        </div>
      ) : (
        <form onSubmit={handleClear} className="space-y-4">
          {/* Safety Guarantee Callout */}
          <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-bold">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>Non-Destructive Reset</span>
            </div>
            <p className="text-gray-600 dark:text-gray-300/90 leading-relaxed text-[11px]">
              This option erases <strong>ONLY daily logged attendance entries</strong>. Your subjects, timetable slots, teacher names, grading schemes, marks, and tasks will remain <strong>completely safe and intact</strong>.
            </p>
          </div>

          {/* Subject Filter */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              Select Scope
            </label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="all">All Subjects ({courses.length} subjects)</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code || 'Course'})
                </option>
              ))}
            </select>
            {selectedCourse && (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Only records for <span className="font-semibold text-gray-700 dark:text-gray-300">{selectedCourse.name}</span> will be cleared. Other subjects will not be touched.
              </p>
            )}
          </div>

          {/* Date Range Checkbox & Inputs */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl space-y-2.5">
            <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isDateFilterEnabled}
                onChange={e => setIsDateFilterEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                Limit to specific date range
              </span>
            </label>

            {isDateFilterEnabled && (
              <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opening Balances Checkbox */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/80 rounded-2xl space-y-1">
            <label className="flex items-start gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={resetOpeningBalances}
                onChange={e => setResetOpeningBalances(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500 mt-0.5"
              />
              <div>
                <span>Also reset opening balances to 0</span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                  Resets initial attended and initial conducted counts on {selectedCourse ? 'this subject' : 'all subjects'} to 0. Leave unchecked to keep your portal starting baseline.
                </p>
              </div>
            </label>
          </div>

          {/* Impact Summary Banner */}
          <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                {totalRecordsToClear === 0 && !resetOpeningBalances
                  ? 'No attendance records match this filter'
                  : `Found ${totalRecordsToClear} logged record(s) to clear`}
              </span>
            </div>
            {resetOpeningBalances && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                + Reset Baselines
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isClearing}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isClearing || (totalRecordsToClear === 0 && !resetOpeningBalances)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm min-h-[44px] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isClearing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Clearing Attendance...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Clear Attendance Data
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </ResponsiveDialog>
  );
};

