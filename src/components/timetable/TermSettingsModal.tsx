import React, { useState } from 'react';
import { Plus, Trash2, Calendar, Clock, Sliders } from 'lucide-react';
import { Term, Course, Weekday, PeriodTiming, SaturdayRule, LabAttendanceRule } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  setPeriodTimings as setGlobalPeriodTimings,
  PeriodTimingConfig,
  getLabAttendanceRule,
  setLabAttendanceRule as setGlobalLabRule,
} from '../../utils/preferences';

interface TermSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  term: Term;
  courses: Course[];
  onSaveTerm: (updates: {
    start_date: string;
    end_date: string;
    attendance_threshold: number;
    working_days: Weekday[];
    period_timings: PeriodTiming[];
    saturday_rule?: SaturdayRule;
    lab_attendance_rule?: LabAttendanceRule;
  }) => Promise<void>;
  onUpdateCourseThreshold: (courseId: string, threshold: number | null) => Promise<void>;
}

const ALL_WEEKDAYS: { day: Weekday; label: string }[] = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

const SATURDAY_RULES: { value: SaturdayRule; label: string }[] = [
  { value: 'second_saturday_off', label: '2nd Saturday Off (Standard)' },
  { value: 'second_fourth_saturday_off', label: '2nd & 4th Saturday Off' },
  { value: 'all_saturdays_off', label: 'All Saturdays Off (5-Day Week)' },
  { value: 'all_working', label: 'All Saturdays Working' },
];

export const TermSettingsModal: React.FC<TermSettingsModalProps> = ({
  isOpen,
  onClose,
  term,
  courses,
  onSaveTerm,
  onUpdateCourseThreshold,
}) => {
  const [startDate, setStartDate] = useState(term.start_date);
  const [endDate, setEndDate] = useState(term.end_date);
  const [attendanceThreshold, setAttendanceThreshold] = useState(term.attendance_threshold || 75);
  const [workingDays, setWorkingDays] = useState<Weekday[]>(term.working_days || [1, 2, 3, 4, 5, 6]);
  const [saturdayRule, setSaturdayRule] = useState<SaturdayRule>(term.saturday_rule || 'second_saturday_off');
  const [labAttendanceRule, setLabAttendanceRule] = useState<LabAttendanceRule>(
    term.lab_attendance_rule || getLabAttendanceRule()
  );
  const [periodTimings, setPeriodTimings] = useState<PeriodTiming[]>(term.period_timings || []);
  const [courseThresholds, setCourseThresholds] = useState<Record<string, number | null>>(
    Object.fromEntries(courses.map(c => [c.id, c.attendance_threshold_override]))
  );

  const [newPeriodName, setNewPeriodName] = useState('');
  const [newPeriodStart, setNewPeriodStart] = useState('09:00');
  const [newPeriodEnd, setNewPeriodEnd] = useState('09:55');
  const [newPeriodBreak, setNewPeriodBreak] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleWorkingDay = (day: Weekday) => {
    if (workingDays.includes(day)) {
      if (workingDays.length > 1) {
        setWorkingDays(workingDays.filter(d => d !== day));
      }
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  const handleAddPeriod = () => {
    if (!newPeriodName.trim()) return;
    const newTiming: PeriodTiming = {
      id: `p-${Date.now()}`,
      name: newPeriodName.trim(),
      start_time: newPeriodStart,
      end_time: newPeriodEnd,
      is_break: newPeriodBreak,
    };
    setPeriodTimings([...periodTimings, newTiming].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setNewPeriodName('');
  };

  const handleRemovePeriod = (id: string) => {
    setPeriodTimings(periodTimings.filter(p => p.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSaveTerm({
        start_date: startDate,
        end_date: endDate,
        attendance_threshold: attendanceThreshold,
        working_days: workingDays,
        period_timings: periodTimings,
        saturday_rule: saturdayRule,
        lab_attendance_rule: labAttendanceRule,
      });

      // Synchronize lab rule to global preferences
      setGlobalLabRule(labAttendanceRule);

      // Sync non-break teaching periods to preferences
      const configTimings: PeriodTimingConfig[] = periodTimings
        .filter(p => !p.is_break)
        .map((p, idx) => ({
          period: idx + 1,
          name: p.name,
          startTime: p.start_time,
          endTime: p.end_time,
        }));
      if (configTimings.length > 0) {
        setGlobalPeriodTimings(configTimings);
      }

      // Update per-course threshold overrides
      for (const [courseId, thresh] of Object.entries(courseThresholds)) {
        await onUpdateCourseThreshold(courseId, thresh);
      }

      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Semester & Timetable Settings"
      description="Configure dates, attendance thresholds, working days, and period timings"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Term Dates & Attendance Threshold */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80 space-y-3">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            Semester Dates & Threshold
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                Term Threshold (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={attendanceThreshold}
                  onChange={e => setAttendanceThreshold(parseInt(e.target.value) || 75)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs font-bold"
                  required
                />
                <span className="text-xs text-gray-500 font-bold">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Working Days & Saturday Rule */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80 space-y-3">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-indigo-500" />
            Configurable Working Days & Saturday Rule
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Select standard instructional days for your semester (Sunday is optional).
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 pt-1">
            {ALL_WEEKDAYS.map(w => {
              const isWorking = workingDays.includes(w.day);
              return (
                <button
                  type="button"
                  key={w.day}
                  onClick={() => toggleWorkingDay(w.day)}
                  className={`py-2 px-1 text-xs font-bold rounded-xl border transition-all min-h-[44px] ${
                    isWorking
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  {w.label}
                  <span className="block text-[10px] font-normal opacity-80">
                    {isWorking ? 'Working' : 'Off'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
              Saturday Off Rule (e.g. 2nd Saturday Off)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SATURDAY_RULES.map(rule => (
                <button
                  type="button"
                  key={rule.value}
                  onClick={() => setSaturdayRule(rule.value)}
                  className={`p-2 rounded-xl border text-xs font-bold text-left transition-all ${
                    saturdayRule === rule.value
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-600 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-600'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {rule.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Attendance Counting Policy */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-indigo-500" />
              Attendance Counting Policy
            </h4>
            <span className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">
              {labAttendanceRule === 'single_session' ? '1 per Session' : '1 per Hour / Period'}
            </span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            How does your college evaluate attendance for multi-hour sessions, laboratory practicals, or electives (e.g. 2-hour labs or NSS)?
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setLabAttendanceRule('per_hour')}
              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col justify-between min-h-[52px] ${
                labAttendanceRule === 'per_hour'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>1 attendance per hour / period</span>
              <span className={`text-[10px] font-normal mt-0.5 ${labAttendanceRule === 'per_hour' ? 'text-indigo-100' : 'text-gray-400'}`}>
                A 2-hour session awards +2 attendance points
              </span>
            </button>
            <button
              type="button"
              onClick={() => setLabAttendanceRule('single_session')}
              className={`p-3 rounded-xl border text-xs font-bold text-left transition-all flex flex-col justify-between min-h-[52px] ${
                labAttendanceRule === 'single_session'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>1 attendance per session</span>
              <span className={`text-[10px] font-normal mt-0.5 ${labAttendanceRule === 'single_session' ? 'text-indigo-100' : 'text-gray-400'}`}>
                A 2-hour session awards +1 attendance point
              </span>
            </button>
          </div>
        </div>

        {/* Period Timings Editor */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              Named Period Timings & Breaks
            </h4>
            <span className="text-[11px] text-gray-400 font-mono">
              {periodTimings.length} presets
            </span>
          </div>

          {/* List of current period timings */}
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {periodTimings.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No custom period timings defined.</p>
            ) : (
              periodTimings.map(p => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        p.is_break
                          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-700'
                          : 'bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700'
                      }`}
                    >
                      {p.is_break ? 'Break' : 'Class'}
                    </span>
                    <span className="font-bold text-gray-800 dark:text-gray-200">{p.name}</span>
                    <span className="font-mono text-gray-500">
                      ({p.start_time} - {p.end_time})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePeriod(p.id)}
                    className="p-1 text-gray-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add period inline form */}
          <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Period 1, Lunch)"
                value={newPeriodName}
                onChange={e => setNewPeriodName(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="time"
                value={newPeriodStart}
                onChange={e => setNewPeriodStart(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <input
                type="time"
                value={newPeriodEnd}
                onChange={e => setNewPeriodEnd(e.target.value)}
                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddPeriod}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 text-xs font-bold transition-colors min-h-[44px]"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Period
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-gray-500 dark:text-gray-400">
              <input
                type="checkbox"
                checked={newPeriodBreak}
                onChange={e => setNewPeriodBreak(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-indigo-600"
              />
              Mark as break or lunch interval
            </label>
          </div>
        </div>

        {/* Per-Subject Attendance Threshold Overrides */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700/80 space-y-3">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Subject-Specific Threshold Overrides
          </h4>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Set custom attendance requirement for individual courses (leave blank to use semester default of {attendanceThreshold}%).
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {courses.map(c => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-2.5 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: c.color || '#6366f1' }}
                  />
                  <div className="truncate">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{c.name}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{c.code || 'NO-CODE'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={`${attendanceThreshold}`}
                    value={courseThresholds[c.id] ?? ''}
                    onChange={e => {
                      const val = e.target.value === '' ? null : parseInt(e.target.value);
                      setCourseThresholds({
                        ...courseThresholds,
                        [c.id]: isNaN(val as number) ? null : val,
                      });
                    }}
                    className="w-16 px-2 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 text-center font-bold text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <span className="text-gray-500 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm min-h-[44px]"
          >
            {isSubmitting ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};

