import React, { useState, useEffect } from 'react';
import { Course, CourseType, LabAttendanceRule } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { CourseColorPicker } from '../common/CourseColorPicker';
import { useDateFormat, formatDate, getDefaultSplitAttendance } from '../../utils/preferences';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    code: string;
    credits: number;
    type: CourseType;
    color: string;
    attendance_threshold_override: number | null;
    medical_counts_as_present: boolean;
    duty_leave_counts_as_present: boolean;
    initial_attended?: number;
    initial_conducted?: number;
    tracking_start_date?: string | null;
    faculty?: string | null;
    lab_attendance_rule?: LabAttendanceRule | null;
    split_attendance?: boolean;
    lab_attendance_threshold_override?: number | null;
    initial_theory_attended?: number;
    initial_theory_conducted?: number;
    initial_lab_attended?: number;
    initial_lab_conducted?: number;
  }) => void;
  initialCourse?: Course;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCourse,
}) => {
  const dateFormat = useDateFormat();
  const [name, setName] = useState(initialCourse?.name || '');
  const [code, setCode] = useState(initialCourse?.code || '');
  const [faculty, setFaculty] = useState(initialCourse?.faculty || '');
  const [credits, setCredits] = useState(initialCourse?.credits ?? 4);
  const [type, setType] = useState<CourseType>(initialCourse?.type || 'theory');
  const [splitAttendance, setSplitAttendance] = useState<boolean>(
    initialCourse?.split_attendance ?? getDefaultSplitAttendance()
  );
  const [labThresholdOverride, setLabThresholdOverride] = useState<string>(
    initialCourse?.lab_attendance_threshold_override?.toString() || ''
  );
  const [initialTheoryAttended, setInitialTheoryAttended] = useState<number>(
    initialCourse?.initial_theory_attended ?? 0
  );
  const [initialTheoryConducted, setInitialTheoryConducted] = useState<number>(
    initialCourse?.initial_theory_conducted ?? 0
  );
  const [initialLabAttended, setInitialLabAttended] = useState<number>(
    initialCourse?.initial_lab_attended ?? 0
  );
  const [initialLabConducted, setInitialLabConducted] = useState<number>(
    initialCourse?.initial_lab_conducted ?? 0
  );
  const [labAttendanceRule, setLabAttendanceRule] = useState<LabAttendanceRule | null>(
    initialCourse?.lab_attendance_rule ?? null
  );
  const [color, setColor] = useState(initialCourse?.color || '#6366f1');
  const [thresholdOverride, setThresholdOverride] = useState<string>(
    initialCourse?.attendance_threshold_override?.toString() || ''
  );
  const [medicalCounts, setMedicalCounts] = useState(
    initialCourse?.medical_counts_as_present ?? false
  );
  const [dutyLeaveCounts, setDutyLeaveCounts] = useState(
    initialCourse?.duty_leave_counts_as_present ?? true
  );
  const [initialAttended, setInitialAttended] = useState<number>(
    initialCourse?.initial_attended ?? 0
  );
  const [initialConducted, setInitialConducted] = useState<number>(
    initialCourse?.initial_conducted ?? 0
  );
  const [trackingStartDate, setTrackingStartDate] = useState<string>(
    initialCourse?.tracking_start_date ?? ''
  );

  useEffect(() => {
    if (initialCourse) {
      setName(initialCourse.name);
      setCode(initialCourse.code);
      setFaculty(initialCourse.faculty || '');
      setCredits(initialCourse.credits);
      setType(initialCourse.type);
      setSplitAttendance(initialCourse.split_attendance ?? getDefaultSplitAttendance());
      setLabThresholdOverride(initialCourse.lab_attendance_threshold_override?.toString() || '');
      setInitialTheoryAttended(initialCourse.initial_theory_attended ?? 0);
      setInitialTheoryConducted(initialCourse.initial_theory_conducted ?? 0);
      setInitialLabAttended(initialCourse.initial_lab_attended ?? 0);
      setInitialLabConducted(initialCourse.initial_lab_conducted ?? 0);
      setLabAttendanceRule(initialCourse.lab_attendance_rule ?? null);
      setColor(initialCourse.color);
      setThresholdOverride(initialCourse.attendance_threshold_override?.toString() || '');
      setMedicalCounts(initialCourse.medical_counts_as_present);
      setDutyLeaveCounts(initialCourse.duty_leave_counts_as_present);
      setInitialAttended(initialCourse.initial_attended ?? 0);
      setInitialConducted(initialCourse.initial_conducted ?? 0);
      setTrackingStartDate(initialCourse.tracking_start_date ?? '');
    } else {
      setName('');
      setCode('');
      setFaculty('');
      setCredits(4);
      setType('theory');
      setSplitAttendance(getDefaultSplitAttendance());
      setLabThresholdOverride('');
      setInitialTheoryAttended(0);
      setInitialTheoryConducted(0);
      setInitialLabAttended(0);
      setInitialLabConducted(0);
      setLabAttendanceRule(null);
      setColor('#6366f1');
      setThresholdOverride('');
      setMedicalCounts(false);
      setDutyLeaveCounts(true);
      setInitialAttended(0);
      setInitialConducted(0);
      setTrackingStartDate('');
    }
  }, [initialCourse, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const isSplit = type === 'theory_and_lab' && splitAttendance;
    const finalInitialAttended = isSplit
      ? Math.max(0, Number(initialTheoryAttended) + Number(initialLabAttended))
      : Math.max(0, Number(initialAttended) || 0);
    const finalInitialConducted = isSplit
      ? Math.max(0, Number(initialTheoryConducted) + Number(initialLabConducted))
      : Math.max(0, Number(initialConducted) || 0);

    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      faculty: faculty.trim() || null,
      credits: Number(credits) || 3,
      type,
      color,
      attendance_threshold_override: thresholdOverride ? Number(thresholdOverride) : null,
      medical_counts_as_present: medicalCounts,
      duty_leave_counts_as_present: dutyLeaveCounts,
      initial_attended: finalInitialAttended,
      initial_conducted: finalInitialConducted,
      tracking_start_date: trackingStartDate ? trackingStartDate : null,
      lab_attendance_rule: labAttendanceRule,
      split_attendance: isSplit,
      lab_attendance_threshold_override: isSplit && labThresholdOverride.trim() !== ''
        ? Number(labThresholdOverride)
        : null,
      initial_theory_attended: isSplit ? Math.max(0, Number(initialTheoryAttended) || 0) : 0,
      initial_theory_conducted: isSplit ? Math.max(0, Number(initialTheoryConducted) || 0) : 0,
      initial_lab_attended: isSplit ? Math.max(0, Number(initialLabAttended) || 0) : 0,
      initial_lab_conducted: isSplit ? Math.max(0, Number(initialLabConducted) || 0) : 0,
    });
    onClose();
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialCourse ? 'Edit Subject' : 'Add New Subject'}
      description="Configure subject code, credits, component type, and attendance rules."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Subject Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Operating Systems"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Subject Code
            </label>
            <input
              type="text"
              placeholder="e.g. CS501"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Credits
            </label>
            <input
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={credits}
              onChange={e => setCredits(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Professor / Faculty Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Faculty / Professor / Teacher Name (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Dr. A. Sharma / Prof. Rao"
            value={faculty}
            onChange={e => setFaculty(e.target.value)}
            className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Applies to this subject across your timetable schedule, today&apos;s classes, and attendance reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Course Component Type
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as CourseType)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              <option value="theory">Theory Only</option>
              <option value="theory_and_lab">Theory + Practical / Lab (Integrated)</option>
              <option value="lab">Laboratory / Practical Only</option>
              <option value="tutorial">Tutorial</option>
              <option value="project">Project Work</option>
              <option value="elective">Elective</option>
              <option value="audit">Audit (Non-Credit)</option>
            </select>
            {type === 'theory_and_lab' && (
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1.5 font-medium leading-tight">
                💡 Unified subject for lectures & practicals. Schedule slots as Theory or Lab without creating duplicate subjects!
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Threshold Override % (Optional)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Default"
              value={thresholdOverride}
              onChange={e => setThresholdOverride(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
        </div>

        {/* Attendance Partitioning Toggle for Theory + Lab */}
        {type === 'theory_and_lab' && (
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                  Separate Attendance Tracking
                </label>
                <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                  Track Theory lectures and Lab practicals as separate attendance partitions under this same subject.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-3">
                <input
                  type="checkbox"
                  checked={splitAttendance}
                  onChange={e => setSplitAttendance(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {splitAttendance && (
              <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 space-y-2">
                <div>
                  <label className="block text-xs font-semibold text-indigo-900 dark:text-indigo-300 mb-1">
                    Lab Attendance Threshold % (Optional Override)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder={`Default (${thresholdOverride || 'from Settings'}%)`}
                    value={labThresholdOverride}
                    onChange={e => setLabThresholdOverride(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                    Leave blank to use the same threshold for both Theory and Lab.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attendance Counting Rule (Available for all subjects e.g. labs, electives like NSS, multi-period classes) */}
        <div className="p-3.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-sky-900 dark:text-sky-200">
              Attendance Counting Rule
            </label>
            <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 rounded-full">
              {labAttendanceRule === null ? 'Default from Settings' : labAttendanceRule === 'single_session' ? '1 per Session' : '1 per Hour / Period'}
            </span>
          </div>
          <p className="text-[11px] text-sky-700 dark:text-sky-400">
            Configure how multi-hour periods, practicals, or electives (e.g. 2-hour labs or NSS) count toward attendance in this subject.
          </p>
          <select
            value={labAttendanceRule ?? ''}
            onChange={e => {
              const val = e.target.value;
              setLabAttendanceRule(val === 'per_hour' || val === 'single_session' ? val : null);
            }}
            className="w-full px-3 py-2 text-xs rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-sky-500 min-h-[40px]"
          >
            <option value="">⚙️ Default (Follow App Settings)</option>
            <option value="per_hour">⏱️ 1 attendance per hour / period (e.g. 2hr session = 2 attendance points)</option>
            <option value="single_session">🎯 1 attendance per session (e.g. 2hr session = 1 attendance point)</option>
          </select>
        </div>

        <CourseColorPicker
          value={color}
          onChange={setColor}
          label="Course Accent Color"
        />

        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Attendance Leave Rules
          </label>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Medical leave counts as present
            </span>
            <input
              type="checkbox"
              checked={medicalCounts}
              onChange={e => setMedicalCounts(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Duty / College leave counts as present
            </span>
            <input
              type="checkbox"
              checked={dutyLeaveCounts}
              onChange={e => setDutyLeaveCounts(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Opening Balance (Mid-Semester Start) */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
              Opening Balance (Mid-Semester Start)
            </label>
            <span className="text-[11px] text-gray-400">Optional</span>
          </div>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            Enter counts from your college portal to begin tracking mid-semester.
          </p>

          {type === 'theory_and_lab' && splitAttendance ? (
            <div className="space-y-3">
              {/* Theory Opening Balance */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  📘 Theory Lectures Opening Balance
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                      Attended Theory
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialTheoryAttended}
                      onChange={e => setInitialTheoryAttended(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                      Conducted Theory
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialTheoryConducted}
                      onChange={e => setInitialTheoryConducted(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Lab Opening Balance */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 space-y-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  🧪 Lab Practicals Opening Balance
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                      Attended Lab
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialLabAttended}
                      onChange={e => setInitialLabAttended(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-500 mb-1">
                      Conducted Lab
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={initialLabConducted}
                      onChange={e => setInitialLabConducted(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Attended Before Tracking
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialAttended}
                  onChange={e => setInitialAttended(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                  Conducted Before Tracking
                </label>
                <input
                  type="number"
                  min="0"
                  value={initialConducted}
                  onChange={e => setInitialConducted(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Tracking Start Date
            </label>
            <input
              type="date"
              value={trackingStartDate}
              onChange={e => setTrackingStartDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono"
            />
            {trackingStartDate && (
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 block">
                Classes from {formatDate(trackingStartDate, dateFormat)} onwards will be recorded.
              </span>
            )}
          </div>
        </div>

        <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none min-h-[44px] transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-200 dark:shadow-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none min-h-[44px] transition-colors"
          >
            {initialCourse ? 'Save Changes' : 'Create Subject'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
