import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { GraduationCap, Award, Layers } from 'lucide-react';
import { db } from '../db/dexie';

export const GradesScreen: React.FC = () => {
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());

  const totalCredits = courses.reduce((acc, c) => acc + (c.counts_toward_gpa ? c.credits : 0), 0);
  const auditCredits = courses.reduce((acc, c) => acc + (!c.counts_toward_gpa ? c.credits : 0), 0);

  return (
    <div className="p-4 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Grades & Marks
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {program?.degree_type || 'Degree'} • {activeTerm?.name || 'Semester 1'}
        </p>
      </div>

      {/* Credit Summary Card */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {totalCredits}
            </span>
            <p className="text-[11px] text-gray-500 font-medium">GPA Credits ({auditCredits} audit)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-2xl font-black text-gray-900 dark:text-white">
              {courses.length}
            </span>
            <p className="text-[11px] text-gray-500 font-medium">Total Courses</p>
          </div>
        </div>
      </div>

      {/* Courses List */}
      <div className="space-y-2.5">
        <h3 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Enrolled Courses ({courses.length})
        </h3>
        {courses.map(course => (
          <div
            key={course.id}
            className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between"
          >
            <div className="flex items-center gap-2.5">
              <span
                className="w-2.5 h-8 rounded-full"
                style={{ backgroundColor: course.color || '#6366f1' }}
              />
              <div>
                <h4 className="text-xs font-bold text-gray-900 dark:text-white">
                  {course.name}
                </h4>
                <p className="text-[10px] text-gray-500 font-mono">
                  {course.code || 'NO-CODE'} • {course.type}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xs font-bold text-gray-900 dark:text-white">
                {course.credits} Credits
              </span>
              <p className="text-[10px] text-gray-400">
                {course.counts_toward_gpa ? 'Counted in GPA' : 'Audit'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Phase 5 Coming Soon Box */}
      <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 text-center">
        <GraduationCap className="w-6 h-6 text-indigo-600 mx-auto mb-1.5" />
        <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
          Component Marks & CGPA Calculator
        </h4>
        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
          Best-of-N assessment breakdowns and required end-sem marks solver will be delivered in Phase 5.
        </p>
      </div>
    </div>
  );
};
