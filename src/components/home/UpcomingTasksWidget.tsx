import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckSquare, MapPin, ChevronRight } from 'lucide-react';
import { db } from '../../db/dexie';
import { Course } from '../../types';
import { toggleTaskDone } from '../../db/repositories/task.repo';
import { TasksTrackerModal } from '../tasks/TasksTrackerModal';

interface UpcomingTasksWidgetProps {
  courses: Course[];
}

export const UpcomingTasksWidget: React.FC<UpcomingTasksWidgetProps> = ({ courses }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const tasks = useLiveQuery(() => db.task.filter(t => t.deleted_at === null).toArray()) || [];

  // Sort pending tasks by due date
  const pendingTasks = tasks
    .filter(t => !t.done)
    .sort((a, b) => {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    })
    .slice(0, 4);

  const getDueBadge = (dueAt: string | null) => {
    if (!dueAt) return { label: 'No date', color: 'text-gray-400 bg-gray-100 dark:bg-gray-800' };

    const due = new Date(dueAt).getTime();
    const now = Date.now();
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdue = Math.abs(diffDays);
      return {
        label: overdue === 0 ? 'Due Today' : `${overdue}d overdue`,
        color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 font-bold',
      };
    } else if (diffDays === 0) {
      return { label: 'Today', color: 'text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 font-bold' };
    } else if (diffDays === 1) {
      return { label: 'Tomorrow', color: 'text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300' };
    } else {
      return { label: `In ${diffDays}d`, color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 font-medium' };
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Upcoming Deadlines & Exams
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-0.5"
          >
            <span>View All ({tasks.filter(t => !t.done).length})</span>
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {pendingTasks.length === 0 ? (
          <div className="p-4 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              No pending tasks or exams!
            </p>
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              + Add assignment or exam
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {pendingTasks.map(task => {
              const badge = getDueBadge(task.due_at);
              const course = courses.find(c => c.id === task.course_id);

              return (
                <div key={task.id} className="py-2.5 flex items-center justify-between gap-3 group">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskDone(task.id, true)}
                      className="w-4 h-4 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-600 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                          {task.title}
                        </span>
                        <span className="text-[10px] text-gray-400 uppercase font-mono">
                          • {task.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                        {course && (
                          <span className="truncate max-w-[120px] font-semibold text-indigo-600 dark:text-indigo-400">
                            {course.code || course.name}
                          </span>
                        )}
                        {task.venue && (
                          <span className="flex items-center gap-0.5 truncate max-w-[100px]">
                            <MapPin className="w-2.5 h-2.5" />
                            {task.venue}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <TasksTrackerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          courses={courses}
        />
      )}
    </>
  );
};
