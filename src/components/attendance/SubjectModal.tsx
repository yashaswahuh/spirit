import React, { useState, useEffect } from 'react';
import { Course, CourseType } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { CourseColorPicker } from '../common/CourseColorPicker';

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
  }) => void;
  initialCourse?: Course;
}

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialCourse,
}) => {
  const [name, setName] = useState(initialCourse?.name || '');
  const [code, setCode] = useState(initialCourse?.code || '');
  const [faculty, setFaculty] = useState(initialCourse?.faculty || '');
  const [credits, setCredits] = useState(initialCourse?.credits ?? 4);
  const [type, setType] = useState<CourseType>(initialCourse?.type || 'theory');
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
      initial_attended: Math.max(0, Number(initialAttended) || 0),
      initial_conducted: Math.max(0, Number(initialConducted) || 0),
      tracking_start_date: trackingStartDate ? trackingStartDate : null,
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
