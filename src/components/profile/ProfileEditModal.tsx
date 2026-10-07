import React, { useState, useEffect } from 'react';
import { User, GraduationCap, Calendar, Target, CheckCircle2, Save } from 'lucide-react';
import { db } from '../../db/dexie';
import { Profile, Program, DegreeType } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null | undefined;
  program: Program | null | undefined;
}

const DEGREE_OPTIONS: { value: DegreeType; label: string }[] = [
  { value: 'BTech', label: 'B.Tech (Bachelor of Technology)' },
  { value: 'BE', label: 'B.E. (Bachelor of Engineering)' },
  { value: 'BCA', label: 'BCA (Bachelor of Computer Applications)' },
  { value: 'BSc', label: 'B.Sc (Bachelor of Science)' },
  { value: 'BCom', label: 'B.Com (Bachelor of Commerce)' },
  { value: 'BBA', label: 'BBA (Bachelor of Business Admin)' },
  { value: 'MCA', label: 'MCA (Master of Computer Applications)' },
  { value: 'MTech', label: 'M.Tech (Master of Technology)' },
  { value: 'ME', label: 'M.E. (Master of Engineering)' },
  { value: 'MSc', label: 'M.Sc (Master of Science)' },
  { value: 'MBA', label: 'MBA (Master of Business Admin)' },
  { value: 'diploma', label: 'Diploma / Polytechnic' },
];

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  program,
}) => {
  const [name, setName] = useState('');
  const [degreeType, setDegreeType] = useState<DegreeType>('BTech');
  const [branch, setBranch] = useState('');
  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [threshold, setThreshold] = useState<number>(75);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setThreshold(profile.default_attendance_threshold || 75);
    }
    if (program) {
      setDegreeType(program.degree_type || 'BTech');
      setBranch(program.branch_department || '');
      setStartYear(program.start_year || new Date().getFullYear());
    }
  }, [profile, program, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();

      if (profile) {
        await db.profile.update(profile.id, {
          name: name.trim(),
          default_attendance_threshold: Number(threshold),
          updated_at: now,
        });
      }

      if (program) {
        await db.program.update(program.id, {
          degree_type: degreeType,
          branch_department: branch.trim() || 'General Engineering',
          start_year: Number(startYear),
          updated_at: now,
        });
      }

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getInitials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'S';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Student Profile"
      description="Update your name, degree, department, batch year, and attendance target."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar Preview */}
        <div className="flex items-center gap-4 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white text-xl font-black shadow-md flex-shrink-0">
            {getInitials(name || 'Student')}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {name || 'Student Name'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {degreeType} • {branch || 'Department'}
            </p>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Batch of {startYear}
            </span>
          </div>
        </div>

        {/* Name Input */}
        <div>
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-600" />
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Yashaswa Singh"
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Degree & Branch Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              Degree Program
            </label>
            <select
              value={degreeType}
              onChange={e => setDegreeType(e.target.value as DegreeType)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              {DEGREE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
              Branch / Department
            </label>
            <input
              type="text"
              required
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="e.g. Computer Science & Engg"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Batch Year & Attendance Threshold */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Admission / Start Year
            </label>
            <input
              type="number"
              min="2000"
              max="2035"
              value={startYear}
              onChange={e => setStartYear(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-indigo-600" />
              Target Attendance Threshold (%)
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={threshold}
              onChange={e => setThreshold(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">Standard university criteria is 75% or 80%</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-end items-center gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !name.trim()}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-white" />
                Updated!
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};

