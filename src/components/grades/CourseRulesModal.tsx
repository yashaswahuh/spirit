import React, { useState, useEffect } from 'react';
import { Course, CourseType } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { updateCourse } from '../../db/repositories/course.repo';
import { ShieldCheck, Info } from 'lucide-react';

interface CourseRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onSaved?: () => void;
}

export const CourseRulesModal: React.FC<CourseRulesModalProps> = ({
  isOpen,
  onClose,
  course,
  onSaved,
}) => {
  const [credits, setCredits] = useState<number>(course?.credits || 3);
  const [type, setType] = useState<CourseType>(course?.type || 'theory');
  const [countsTowardGpa, setCountsTowardGpa] = useState<boolean>(course?.counts_toward_gpa ?? true);
  const [minInternalMarks, setMinInternalMarks] = useState<string>(
    course?.min_internal_marks !== null && course?.min_internal_marks !== undefined
      ? course.min_internal_marks.toString()
      : ''
  );
  const [minEndSemMarks, setMinEndSemMarks] = useState<string>(
    course?.min_end_sem_marks !== null && course?.min_end_sem_marks !== undefined
      ? course.min_end_sem_marks.toString()
      : ''
  );
  const [passMarks, setPassMarks] = useState<string>(
    course?.pass_marks !== null && course?.pass_marks !== undefined
      ? course.pass_marks.toString()
      : '40'
  );

  useEffect(() => {
    if (!course) return;
    setCredits(course.credits);
    setType(course.type);
    setCountsTowardGpa(course.type === 'audit' ? false : course.counts_toward_gpa);
    setMinInternalMarks(
      course.min_internal_marks !== null && course.min_internal_marks !== undefined
        ? course.min_internal_marks.toString()
        : ''
    );
    setMinEndSemMarks(
      course.min_end_sem_marks !== null && course.min_end_sem_marks !== undefined
        ? course.min_end_sem_marks.toString()
        : ''
    );
    setPassMarks(
      course.pass_marks !== null && course.pass_marks !== undefined
        ? course.pass_marks.toString()
        : '40'
    );
  }, [course, isOpen]);

  if (!course) return null;

  const handleTypeChange = (newType: CourseType) => {
    setType(newType);
    if (newType === 'audit') {
      setCountsTowardGpa(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateCourse(course.id, {
      credits,
      type,
      counts_toward_gpa: type === 'audit' ? false : countsTowardGpa,
      min_internal_marks: minInternalMarks.trim() !== '' ? parseFloat(minInternalMarks) : null,
      min_end_sem_marks: minEndSemMarks.trim() !== '' ? parseFloat(minEndSemMarks) : null,
      pass_marks: passMarks.trim() !== '' ? parseFloat(passMarks) : null,
    });
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Course Rules & Credits: ${course.name}`}
      description="Configure credits, academic weightage, and passing eligibility thresholds"
      maxWidth="md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        {/* Credits and Course Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Course Credits
            </label>
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              required
              value={credits}
              onChange={e => setCredits(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Component Type
            </label>
            <select
              value={type}
              onChange={e => handleTypeChange(e.target.value as CourseType)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white"
            >
              <option value="theory">Theory Lecture</option>
              <option value="lab">Laboratory / Practical</option>
              <option value="tutorial">Tutorial</option>
              <option value="project">Project / Dissertation</option>
              <option value="elective">Elective</option>
              <option value="audit">Audit / Non-Credit</option>
            </select>
          </div>
        </div>

        {/* Counts toward GPA Toggle */}
        <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">
              Counts toward SGPA / CGPA
            </h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {type === 'audit'
                ? 'Audit courses are pass/fail only and never affect GPA calculation.'
                : 'Turn off for zero-credit or non-graded university requirements.'}
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              disabled={type === 'audit'}
              checked={countsTowardGpa && type !== 'audit'}
              onChange={e => setCountsTowardGpa(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        {/* Passing Thresholds */}
        <div className="space-y-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
            Institutional Passing Rules
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Min. Internal Marks
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Optional"
                value={minInternalMarks}
                onChange={e => setMinInternalMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">To sit for end-sem</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Min. End-Sem Marks
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="Optional"
                value={minEndSemMarks}
                onChange={e => setMinEndSemMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">Separate min cutoff</span>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                Overall Pass %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                placeholder="e.g. 40 or 50"
                value={passMarks}
                onChange={e => setPassMarks(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold text-gray-900 dark:text-white"
              />
              <span className="text-[10px] text-gray-400">Total combined cutoff</span>
            </div>
          </div>
        </div>

        {/* Notice Info */}
        <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-700 dark:text-blue-300">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <p>
            Students falling below the required attendance threshold (e.g. {course.attendance_threshold_override || 75}%) will be automatically marked at risk of detention.
          </p>
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 min-h-[40px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-colors min-h-[40px]"
          >
            Save Rules
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
