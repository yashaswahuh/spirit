import React, { useState } from 'react';
import {
  GraduationCap,
  Calendar,
  BookOpen,
  Clock,
  Percent,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { ALL_PROGRAM_PRESETS, ProgramPreset } from '../../presets/programs';
import { OnboardingData, saveOnboardingSetup, seedDemoData } from '../../db/repositories/setup.repo';

interface OnboardingWizardProps {
  onComplete: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<ProgramPreset>(ALL_PROGRAM_PRESETS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [userName, setUserName] = useState('');
  const [branchName, setBranchName] = useState('Computer Science');
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [termName, setTermName] = useState('Semester 1');
  const [termNumber, setTermNumber] = useState(1);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-08-01`);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear()}-12-15`);
  const [threshold, setThreshold] = useState(75);

  const [courses, setCourses] = useState<Array<{
    name: string;
    code: string;
    credits: number;
    type: 'theory' | 'lab' | 'tutorial' | 'project' | 'elective' | 'audit';
    color: string;
  }>>([
    { name: 'Data Structures & Algorithms', code: 'CS201', credits: 4, type: 'theory', color: '#6366f1' },
    { name: 'Computer Architecture', code: 'CS202', credits: 4, type: 'theory', color: '#0ea5e9' },
    { name: 'Object Oriented Programming', code: 'CS203', credits: 3, type: 'theory', color: '#10b981' },
    { name: 'DSA Laboratory', code: 'CS204L', credits: 2, type: 'lab', color: '#f59e0b' },
  ]);

  const handlePresetSelect = (preset: ProgramPreset) => {
    setSelectedPreset(preset);
    setTermNumber(preset.starting_term_number);
    setTermName(`Semester ${preset.starting_term_number}`);
    setThreshold(preset.default_attendance_threshold);
  };

  const addCourse = () => {
    const colors = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6'];
    const randomColor = colors[courses.length % colors.length];
    setCourses([
      ...courses,
      {
        name: `Course ${courses.length + 1}`,
        code: `SUB${courses.length + 1}01`,
        credits: 3,
        type: 'theory',
        color: randomColor,
      },
    ]);
  };

  const removeCourse = (index: number) => {
    setCourses(courses.filter((_, i) => i !== index));
  };

  const handleQuickDemo = async () => {
    setIsSubmitting(true);
    try {
      await seedDemoData();
      onComplete();
    } catch (err) {
      console.error('Failed to seed demo data', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      // Auto-generate basic weekday timetable slots for the courses
      const slots: OnboardingData['slots'] = [];
      const weekdays: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5]; // Mon to Fri
      courses.forEach((_, idx) => {
        // Assign 3 periods per week to each course
        const days = [weekdays[idx % 5], weekdays[(idx + 2) % 5]];
        days.forEach(day => {
          slots.push({
            courseIndex: idx,
            weekday: day,
            startTime: '09:00',
            endTime: '09:55',
          });
        });
      });

      const setupData: OnboardingData = {
        userName: userName.trim() || 'Student',
        degreeType: selectedPreset.degree_type,
        branchName: branchName.trim() || 'General',
        startYear,
        entryType: selectedPreset.entry_type,
        termNumber,
        termName,
        startDate,
        endDate,
        attendanceThreshold: threshold,
        courses,
        slots,
      };

      await saveOnboardingSetup(setupData);
      onComplete();
    } catch (err) {
      console.error('Failed to complete onboarding setup', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 flex flex-col justify-between overflow-y-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-xl sm:max-w-2xl w-full mx-auto pb-24">
        {/* Top Header & Progress */}
        <div className="pt-2 pb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              Step {step} of 5
            </span>
            <button
              onClick={handleQuickDemo}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 py-1 px-2.5 rounded-lg border border-gray-200 dark:border-gray-800 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Skip & Load Demo
            </button>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Degree Preset */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <GraduationCap className="w-6 h-6 text-indigo-600" />
                Select Your Degree Preset
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Choose your university program structure. Everything can be customized.
              </p>
            </div>

            {/* Disclaimer Notice */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <span>
                <strong>Note:</strong> Presets are APPROXIMATIONS. Check your university’s syllabus handbook and edit as necessary.
              </span>
            </div>

            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {ALL_PROGRAM_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p)}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all ${
                    selectedPreset.id === p.id
                      ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 ring-1 ring-indigo-600'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {p.duration_years} yrs • {p.entry_type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {p.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: Program & Term Details */}
        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-6 h-6 text-indigo-600" />
                Program & Semester Details
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Tell Spirit what semester you are currently enrolled in.
              </p>
            </div>

            <div className="space-y-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Your Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Branch / Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Computer Science & Engineering"
                  value={branchName}
                  onChange={e => setBranchName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Admission Start Year
                  </label>
                  <input
                    type="number"
                    value={startYear}
                    onChange={e => setStartYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Current Semester Name
                  </label>
                  <input
                    type="text"
                    value={termName}
                    onChange={e => setTermName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Term Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                    Term End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Add Subjects */}
        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  Your Subjects ({courses.length})
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Add or edit your courses for this semester.
                </p>
              </div>
              <button
                type="button"
                onClick={addCourse}
                className="flex items-center gap-1 bg-indigo-600 text-white text-xs font-semibold py-1.5 px-3 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {courses.map((course, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: course.color }}
                    />
                    <input
                      type="text"
                      placeholder="Subject name"
                      value={course.name}
                      onChange={e => {
                        const updated = [...courses];
                        updated[idx].name = e.target.value;
                        setCourses(updated);
                      }}
                      className="flex-1 font-bold text-sm bg-transparent border-b border-dashed border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                    {courses.length > 1 && (
                      <button
                        onClick={() => removeCourse(idx)}
                        className="text-gray-400 hover:text-red-500 p-1"
                        aria-label="Remove subject"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400">Code</span>
                      <input
                        type="text"
                        value={course.code}
                        onChange={e => {
                          const updated = [...courses];
                          updated[idx].code = e.target.value.toUpperCase();
                          setCourses(updated);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">Credits</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={course.credits}
                        onChange={e => {
                          const updated = [...courses];
                          updated[idx].credits = Number(e.target.value);
                          setCourses(updated);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400">Type</span>
                      <select
                        value={course.type}
                        onChange={e => {
                          const updated = [...courses];
                          updated[idx].type = e.target.value as any;
                          setCourses(updated);
                        }}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
                      >
                        <option value="theory">Theory</option>
                        <option value="lab">Lab</option>
                        <option value="tutorial">Tutorial</option>
                        <option value="audit">Audit</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: Timetable Timings */}
        {step === 4 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-6 h-6 text-indigo-600" />
                Timetable Setup
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                We will generate default weekly slots for your {courses.length} subjects.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    Auto-Schedule Periods
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Distributes your subjects across Monday–Friday (9:00 AM – 1:00 PM).
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-gray-800">
                You can freely edit slots, add Saturday swap days, and set holidays anytime from the Timetable tab.
              </p>
            </div>
          </div>
        )}

        {/* STEP 5: Attendance Threshold */}
        {step === 5 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Percent className="w-6 h-6 text-indigo-600" />
                Attendance Threshold
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Set the minimum attendance percentage mandated by your college.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center space-y-5">
              <div>
                <span className="text-5xl font-black text-indigo-600 dark:text-indigo-400">
                  {threshold}%
                </span>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Required Minimum Attendance
                </p>
              </div>

              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={threshold}
                onChange={e => setThreshold(Number(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-gray-200 dark:bg-gray-800 rounded-lg cursor-pointer"
              />

              <div className="flex justify-center gap-2">
                {[75, 80, 85].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setThreshold(t)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                      threshold === t
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600'
                        : 'border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {t}% {t === 75 ? '(Standard)' : ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-40">
        <div className="max-w-xl sm:max-w-2xl mx-auto flex items-center gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              disabled={isSubmitting}
              className="py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 min-h-[48px] flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm min-h-[48px] flex items-center justify-center gap-1 shadow-md shadow-indigo-200 dark:shadow-none"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm min-h-[48px] flex items-center justify-center gap-1 shadow-md shadow-indigo-200 dark:shadow-none"
            >
              {isSubmitting ? 'Setting up...' : 'Get Started'}
              <Sparkles className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
