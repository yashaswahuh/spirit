import React, { useState } from 'react';
import {
  Calendar,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Play,
} from 'lucide-react';
import { Term, Course, GradeResult } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { setActiveTerm, lockTerm } from '../../db/repositories/term.repo';
import { NextSemesterWizardModal } from './NextSemesterWizardModal';

interface TermManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  terms: Term[];
  allCourses: Course[];
  allGradeResults: GradeResult[];
  activeTermId?: string | null;
  onTermChanged?: () => void;
}

export const TermManagerModal: React.FC<TermManagerModalProps> = ({
  isOpen,
  onClose,
  terms,
  allCourses,
  allGradeResults,
  activeTermId,
  onTermChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'terms' | 'backlogs'>('terms');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [loadingTermId, setLoadingTermId] = useState<string | null>(null);

  const activeTerm = terms.find(t => t.id === activeTermId) || terms.find(t => t.status === 'ongoing') || terms[0];

  const handleMakeActive = async (termId: string) => {
    setLoadingTermId(termId);
    try {
      await setActiveTerm(termId);
      if (onTermChanged) onTermChanged();
    } finally {
      setLoadingTermId(null);
    }
  };

  const handleLockTerm = async (termId: string) => {
    setLoadingTermId(termId);
    try {
      await lockTerm(termId);
      if (onTermChanged) onTermChanged();
    } finally {
      setLoadingTermId(null);
    }
  };

  // Compile backlogs across all terms
  const allBacklogItems: Array<{
    course: Course;
    term: Term | undefined;
    latestResult: GradeResult;
    attempts: GradeResult[];
  }> = [];

  for (const course of allCourses) {
    const courseResults = allGradeResults.filter(g => g.course_id === course.id);
    if (courseResults.length === 0) continue;

    const sorted = [...courseResults].sort((a, b) => b.attempt_number - a.attempt_number);
    const latest = sorted[0];

    if (!latest.is_passing || latest.letter_grade === 'F' || latest.letter_grade === 'AB') {
      const term = terms.find(t => t.id === course.term_id);
      allBacklogItems.push({
        course,
        term,
        latestResult: latest,
        attempts: sorted,
      });
    }
  }

  return (
    <>
      <ResponsiveDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Term Management & Backlogs"
        description="Switch active semesters, freeze completed terms, and track backlogs."
        maxWidth="lg"
      >
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'terms'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Semesters & Terms ({terms.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('backlogs')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'backlogs'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Backlog Tracker ({allBacklogItems.length})
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Start Next Semester
            </button>
          </div>

          {activeTab === 'terms' ? (
            <div className="space-y-3">
              {terms.map(t => {
                const isOngoing = t.status === 'ongoing';
                const isCompleted = t.status === 'completed';
                const termCourses = allCourses.filter(c => c.term_id === t.id);

                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isOngoing
                        ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 ring-1 ring-indigo-500/20'
                        : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {t.name}
                        </h4>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isOngoing
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : isCompleted
                              ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                          }`}
                        >
                          {isOngoing ? 'Active Ongoing' : isCompleted ? 'Completed / Locked' : 'Upcoming'}
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 font-mono">
                        {t.start_date} to {t.end_date} • {termCourses.length} Courses
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                      {t.sgpa !== null && t.sgpa !== undefined ? (
                        <div className="text-right">
                          <span className="text-sm font-black text-gray-900 dark:text-white font-mono">
                            {t.sgpa.toFixed(2)} SGPA
                          </span>
                          <span className="text-[10px] text-gray-400 block font-medium">Frozen</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <span className="text-xs font-semibold text-gray-400">In Progress</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        {!isOngoing && (
                          <button
                            type="button"
                            disabled={loadingTermId === t.id}
                            onClick={() => handleMakeActive(t.id)}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 text-emerald-600" />
                            Make Active
                          </button>
                        )}

                        {isOngoing && !isCompleted && (
                          <button
                            type="button"
                            disabled={loadingTermId === t.id}
                            onClick={() => handleLockTerm(t.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 hover:bg-amber-100 text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Lock className="w-3 h-3 text-amber-600" />
                            Lock & Finish
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {allBacklogItems.length === 0 ? (
                <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    No Active Backlogs!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    You have clear academic standing across all semesters.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allBacklogItems.map(({ course, term, latestResult, attempts }) => (
                    <div
                      key={course.id}
                      className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-rose-100 dark:border-rose-950/80 shadow-sm flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                            {course.name}
                          </h5>
                          <span className="px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                            Backlog ({latestResult.letter_grade || 'F'})
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">
                          {course.code || 'NO-CODE'} • {term?.name || 'Semester'} • {course.credits} Credits • {attempts.length} Attempt{attempts.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          Retake Needed
                        </span>
                        <p className="text-[10px] text-gray-400">
                          {course.counts_toward_gpa ? '0.0 pts in CGPA' : 'Non-Credit'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      </ResponsiveDialog>

      {/* Start Next Semester Wizard */}
      {isWizardOpen && (
        <NextSemesterWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          currentTerm={activeTerm || null}
          onTermCreated={() => {
            if (onTermChanged) onTermChanged();
          }}
        />
      )}
    </>
  );
};
