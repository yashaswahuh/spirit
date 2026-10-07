import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GraduationCap, Award, Layers } from 'lucide-react';
import { db } from '../db/dexie';
import { PageContainer } from '../components/layout/PageContainer';

export const GradesScreen: React.FC = () => {
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());

  const totalCredits = courses.reduce((acc, c) => acc + (c.counts_toward_gpa ? c.credits : 0), 0);
  const auditCredits = courses.reduce((acc, c) => acc + (!c.counts_toward_gpa ? c.credits : 0), 0);

  return (
    <PageContainer maxWidth="xl" className="space-y-6 animate-fade-in">
      <div className="pb-2 border-b border-gray-100 dark:border-gray-800">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Grades & Marks
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {program?.degree_type || 'Degree'} • {activeTerm?.name || 'Semester 1'}
        </p>
      </div>

      {/* Credit Summary Cards: 2 cols on mobile/tablet, 3 cols on desktop */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 flex-shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {totalCredits}
            </span>
            <p className="text-xs text-gray-500 font-medium mt-0.5">GPA Credits ({auditCredits} audit)</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-3xl font-black text-gray-900 dark:text-white">
              {courses.length}
            </span>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Enrolled Courses</p>
          </div>
        </div>

        {/* Phase 5 Coming Soon Box */}
        <div className="sm:col-span-2 lg:col-span-1 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-3xl p-5 flex items-center gap-3.5">
          <GraduationCap className="w-8 h-8 text-indigo-600 flex-shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Component Marks & SGPA
            </h4>
            <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
              Best-of-N assessment breakdowns and required end-sem marks solver in Phase 5.
            </p>
          </div>
        </div>
      </div>

      {/* Courses List in 2-Column Grid on Tablet/Desktop */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Enrolled Courses ({courses.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3 shadow-sm hover:border-gray-200 dark:hover:border-gray-700 transition-all"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-2.5 h-10 rounded-full flex-shrink-0"
                  style={{ backgroundColor: course.color || '#6366f1' }}
                />
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                    {course.name}
                  </h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">
                    {course.code || 'NO-CODE'} • {course.type}
                  </p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {course.credits} Credits
                </span>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {course.counts_toward_gpa ? 'Counted in GPA' : 'Audit'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
};
