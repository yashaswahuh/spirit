import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  AlertTriangle,
  ShieldCheck,
  TrendingDown,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { Course, Weekday } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  simulateSkippingDates,
  simulateSkippingRecurringWeekday,
  simulateSkippingNUpcomingDays,
  SubjectAttendanceState,
  WhatIfSimulationResult,
} from '../../engine/whatif';
import { computeCourseAttendanceStats } from '../../engine/attendance';
import { getLabAttendanceRule } from '../../utils/preferences';

interface WhatIfModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
  profileThreshold: number;
}

type SimulationMode = 'dates' | 'recurring' | 'n_days';

const WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Every Monday' },
  { day: 2, label: 'Every Tuesday' },
  { day: 3, label: 'Every Wednesday' },
  { day: 4, label: 'Every Thursday' },
  { day: 5, label: 'Every Friday' },
  { day: 6, label: 'Every Saturday' },
];

export const WhatIfModal: React.FC<WhatIfModalProps> = ({
  isOpen,
  onClose,
  courses,
  profileThreshold,
}) => {
  const [mode, setMode] = useState<SimulationMode>('dates');

  // Mode 1: specific dates
  const todayStr = new Date().toISOString().slice(0, 10);
  const [pickedDate, setPickedDate] = useState<string>(todayStr);
  const [selectedDates, setSelectedDates] = useState<string[]>([todayStr]);

  // Mode 2: recurring weekday
  const [selectedWeekday, setSelectedWeekday] = useState<Weekday>(5); // Friday default

  // Mode 3: N upcoming days
  const [nDays, setNDays] = useState<number>(3);

  // Queries
  const slots = useLiveQuery(() => db.timetable_slot.filter(s => s.deleted_at === null).toArray()) || [];
  const versions = useLiveQuery(() => db.timetable_version.filter(v => v.deleted_at === null).toArray()) || [];
  const overrides = useLiveQuery(() => db.timetable_override.filter(o => o.deleted_at === null).toArray()) || [];
  const calendarEvents = useLiveQuery(() => db.calendar_event.filter(e => e.deleted_at === null).toArray()) || [];
  const term = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const records = useLiveQuery(() => db.attendance_record.filter(r => r.deleted_at === null).toArray()) || [];

  // Compute current stats for subjects
  const subjectStates: SubjectAttendanceState[] = courses.map(c => {
    const courseRecords = records.filter(r => r.course_id === c.id);
    const stats = computeCourseAttendanceStats(
      courseRecords,
      {
        medical_counts_as_present: c.medical_counts_as_present,
        duty_leave_counts_as_present: c.duty_leave_counts_as_present,
      },
      c.attendance_threshold_override || profileThreshold,
      {
        initialAttended: c.initial_attended,
        initialConducted: c.initial_conducted,
        trackingStartDate: c.tracking_start_date,
        courseType: c.type,
        labAttendanceRule: c.lab_attendance_rule,
        globalLabRule: getLabAttendanceRule(),
        slots,
        saturdayRule: term?.saturday_rule,
      }
    );

    return {
      course_id: c.id,
      course_name: c.name,
      attended: stats.attended,
      conducted: stats.conducted,
      threshold: c.attendance_threshold_override || profileThreshold,
    };
  });

  const handleAddDate = () => {
    if (!selectedDates.includes(pickedDate)) {
      setSelectedDates([...selectedDates, pickedDate].sort());
    }
  };

  const handleRemoveDate = (d: string) => {
    setSelectedDates(selectedDates.filter(item => item !== d));
  };

  // Run simulation based on current mode
  let result: WhatIfSimulationResult = {
    total_classes_skipped: 0,
    courses_in_danger_count: 0,
    impacts: [],
  };

  const context = {
    versions,
    slots,
    calendarEvents,
    overrides,
    workingDays: term?.working_days || [1, 2, 3, 4, 5, 6],
  };

  if (subjectStates.length > 0) {
    if (mode === 'dates') {
      result = simulateSkippingDates(selectedDates, subjectStates, slots, calendarEvents, context);
    } else if (mode === 'recurring') {
      const termEnd = term?.end_date || '2026-12-31';
      result = simulateSkippingRecurringWeekday(
        selectedWeekday,
        todayStr,
        termEnd,
        subjectStates,
        context
      );
    } else if (mode === 'n_days') {
      result = simulateSkippingNUpcomingDays(nDays, todayStr, subjectStates, context);
    }
  }

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="What-If Attendance Planner"
      description="Simulate the impact of skipping days or recurring classes across all enrolled subjects"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 dark:bg-gray-800 rounded-2xl">
          <button
            type="button"
            onClick={() => setMode('dates')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
              mode === 'dates'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Specific Dates
          </button>

          <button
            type="button"
            onClick={() => setMode('recurring')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
              mode === 'recurring'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Recurring Day
          </button>

          <button
            type="button"
            onClick={() => setMode('n_days')}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all min-h-[42px] ${
              mode === 'n_days'
                ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            N Upcoming Days
          </button>
        </div>

        {/* Mode Inputs */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80">
          {mode === 'dates' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={pickedDate}
                  onChange={e => setPickedDate(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-mono font-bold text-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={handleAddDate}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 min-h-[40px]"
                >
                  Add Date to Skip
                </button>
              </div>

              {/* Selected Dates Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedDates.map(d => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-mono font-semibold text-gray-800 dark:text-gray-200"
                  >
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    {d}
                    <button
                      type="button"
                      onClick={() => handleRemoveDate(d)}
                      className="text-gray-400 hover:text-rose-500 ml-1 text-xs"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {mode === 'recurring' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Skip Recurring Day until Semester End:
              </label>
              <select
                value={selectedWeekday}
                onChange={e => setSelectedWeekday(parseInt(e.target.value) as Weekday)}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white"
              >
                {WEEKDAYS.map(w => (
                  <option key={w.day} value={w.day}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'n_days' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  Number of Consecutive Upcoming Days to Skip:
                </label>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {nDays} {nDays === 1 ? 'day' : 'days'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="14"
                value={nDays}
                onChange={e => setNDays(parseInt(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* Simulation Summary Banner */}
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
            result.courses_in_danger_count > 0
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
              : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                result.courses_in_danger_count > 0
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {result.courses_in_danger_count > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-bold">
                {result.courses_in_danger_count > 0
                  ? `${result.courses_in_danger_count} Subject(s) Drop Into Danger!`
                  : 'All Subjects Remain Above Threshold!'}
              </h4>
              <p className="text-xs opacity-90">
                Total {result.total_classes_skipped} periods would be missed in this scenario.
              </p>
            </div>
          </div>
        </div>

        {/* Subject by Subject Impacts Grid */}
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {result.impacts.map(imp => {
            return (
              <div
                key={imp.course_id}
                className="p-3.5 rounded-2xl bg-white dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                    {imp.course_name}
                  </h5>
                  <div className="flex items-center gap-2 mt-0.5 text-xs">
                    <span className="font-mono text-gray-500">
                      {imp.current_percentage.toFixed(1)}% &rarr;{' '}
                      <span className={imp.remains_safe ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                        {imp.new_percentage.toFixed(1)}%
                      </span>
                    </span>
                    <span className="inline-flex items-center text-[11px] font-bold text-rose-600">
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                      {imp.percentage_change.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                      imp.remains_safe
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {imp.remains_safe ? 'Safe' : 'Danger'}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {imp.remains_safe
                      ? `${imp.new_safe_bunks} bunks left`
                      : `Must attend ${imp.new_must_attend}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ResponsiveDialog>
  );
};
