import React, { useState, useEffect } from 'react';
import { User, GraduationCap, Calendar, Target, CheckCircle2, Save, Clock } from 'lucide-react';
import { db } from '../../db/dexie';
import { Profile, Program } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null | undefined;
  program: Program | null | undefined;
}

const DEGREE_OPTIONS: { value: string; label: string }[] = [
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
  { value: 'BA', label: 'B.A. (Bachelor of Arts)' },
  { value: 'MA', label: 'M.A. (Master of Arts)' },
  { value: 'BArch', label: 'B.Arch (Bachelor of Architecture)' },
  { value: 'BPharm', label: 'B.Pharm (Bachelor of Pharmacy)' },
  { value: 'LLB', label: 'LL.B (Bachelor of Laws)' },
  { value: 'MBBS', label: 'MBBS (Medicine & Surgery)' },
  { value: 'diploma', label: 'Diploma / Polytechnic' },
  { value: 'integrated', label: 'Integrated Dual Degree (5 Years)' },
  { value: 'other_custom', label: '✨ Other / Custom Program (Enter Custom Name)' },
];

const DEFAULT_DURATIONS: Record<string, number> = {
  BTech: 4,
  BE: 4,
  BArch: 5,
  BPharm: 4,
  MBBS: 5,
  BSc: 3,
  BCA: 3,
  BCom: 3,
  BBA: 3,
  BA: 3,
  LLB: 3,
  diploma: 3,
  integrated: 5,
  MTech: 2,
  ME: 2,
  MCA: 2,
  MSc: 2,
  MBA: 2,
  MCom: 2,
  MA: 2,
};

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  profile,
  program,
}) => {
  const [name, setName] = useState('');
  const [degreeType, setDegreeType] = useState<string>('BTech');
  const [customDegreeName, setCustomDegreeName] = useState('');
  const [durationYears, setDurationYears] = useState<number>(4);
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
      const isKnown = DEGREE_OPTIONS.some(
        opt => opt.value.toLowerCase() === (program.degree_type || '').toLowerCase() && opt.value !== 'other_custom'
      );
      if (isKnown) {
        setDegreeType(program.degree_type);
        setCustomDegreeName('');
      } else {
        setDegreeType('other_custom');
        setCustomDegreeName(program.degree_type || '');
      }
      setBranch(program.branch_department || '');
      setStartYear(program.start_year || new Date().getFullYear());
      setDurationYears(program.duration_years || 4);
    }
  }, [profile, program, isOpen]);

  const handleDegreeChange = (newVal: string) => {
    setDegreeType(newVal);
    if (newVal !== 'other_custom' && DEFAULT_DURATIONS[newVal]) {
      setDurationYears(DEFAULT_DURATIONS[newVal]);
    }
  };

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
        const finalDegreeType = degreeType === 'other_custom'
          ? (customDegreeName.trim() || 'Custom Degree')
          : degreeType;

        await db.program.update(program.id, {
          degree_type: finalDegreeType as any,
          branch_department: branch.trim() || 'General Engineering',
          start_year: Number(startYear),
          duration_years: Number(durationYears) || 4,
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

  const displayDegree = degreeType === 'other_custom'
    ? (customDegreeName || 'Custom Degree')
    : degreeType;

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Customize Student Profile"
      description="Update your name, degree program, course duration, and attendance target."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
              {displayDegree} • {branch || 'Department'}
            </p>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Batch of {startYear} – {startYear + durationYears} ({durationYears} Yrs)
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
              onChange={e => handleDegreeChange(e.target.value)}
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

        {/* Custom Degree Name if Custom is selected */}
        {degreeType === 'other_custom' && (
          <div>
            <label className="block text-xs font-bold text-indigo-700 dark:text-indigo-300 mb-1">
              Custom Degree / Program Name *
            </label>
            <input
              type="text"
              required
              value={customDegreeName}
              onChange={e => setCustomDegreeName(e.target.value)}
              placeholder="e.g. B.Des, BSc Nursing, BS-MS, PhD, BMS..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Enter your specific degree name if it isn&apos;t in the standard presets.
            </p>
          </div>
        )}

        {/* Admission Year & Course Duration in Years */}
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
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              Course Duration (Years)
            </label>
            <input
              type="number"
              min="1"
              max="10"
              value={durationYears}
              onChange={e => setDurationYears(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-[10px] text-gray-400 mt-0.5 block">Total years required to complete</span>
          </div>
        </div>

        {/* Dynamic Estimated Graduation Year Banner */}
        <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 font-bold">
            <GraduationCap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span>Estimated Graduation / End Year:</span>
          </div>
          <div className="font-extrabold text-indigo-700 dark:text-indigo-300 font-mono text-sm">
            {startYear + durationYears} <span className="text-[11px] font-normal text-indigo-500">({durationYears} yr duration • Batch {startYear}–{startYear + durationYears})</span>
          </div>
        </div>

        {/* Attendance Threshold */}
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

