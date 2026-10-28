import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckSquare, MapPin, ChevronRight, Plus } from 'lucide-react';
import { db } from '../../db/dexie';
import { Course } from '../../types';
import { toggleTaskDone } from '../../db/repositories/task.repo';
import { TasksTrackerModal } from '../tasks/TasksTrackerModal';
import { useDateFormat, formatDate } from '../../utils/preferences';
import {
  getTaskDueStatus,
  isExamType,
  getTaskTypeLabel,
  calculateTaskStats,
} from '../../engine/tasks';

interface UpcomingTasksWidgetProps {
  courses: Course[];
  onOpenFullTracker?: () => void;
}

export const UpcomingTasksWidget: React.FC<UpcomingTasksWidgetProps> = ({ courses, onOpenFullTracker }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'all' | 'exams' | 'assignments'>('all');
  const [filterTab, setFilterTab] = useState<'all' | 'exams' | 'assignments'>('all');
  const dateFormat = useDateFormat();

  const tasks = useLiveQuery(() => db.task.filter(t => t.deleted_at === null).toArray()) || [];
  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

  // Statistics
  const stats = useMemo(() => calculateTaskStats(tasks), [tasks]);

  // Filter pending tasks
  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (t.done) return false;
        if (filterTab === 'exams') return isExamType(t.type);
        if (filterTab === 'assignments') return !isExamType(t.type);
        return true;
      })
      .sort((a, b) => {
        if (!a.due_at) return 1;
        if (!b.due_at) return -1;
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
      })
      .slice(0, 5);
  }, [tasks, filterTab]);

  const handleOpenModal = (mode: 'all' | 'exams' | 'assignments' = 'all') => {
    setModalMode(mode);
    setIsModalOpen(true);
  };

  const handleViewAll = () => {
    if (onOpenFullTracker) {
      onOpenFullTracker();
    } else {
      handleOpenModal('all');
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        {/* Header Strip */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5 truncate">
                <span>Deadlines & Exams</span>
                {stats.overdue > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                    {stats.overdue} overdue
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-gray-400 font-medium truncate">
                {stats.pending} pending ({stats.upcomingExams} exams)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => handleOpenModal('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-colors cursor-pointer"
              title="Add task or exam"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>

            <button
              type="button"
              onClick={handleViewAll}
              className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 font-bold flex items-center p-1.5 cursor-pointer"
              title="View all tasks & exams"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Chips on Widget */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            All ({stats.pending})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('exams')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'exams'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Exams ({stats.upcomingExams})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('assignments')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              filterTab === 'assignments'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Tasks ({stats.pendingAssignments})
          </button>
        </div>

        {/* Content list */}
        {pendingTasks.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-gray-100 dark:border-gray-800 rounded-2xl space-y-1">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
              No pending {filterTab === 'exams' ? 'exams' : filterTab === 'assignments' ? 'tasks' : 'items'} 🎉
            </p>
            <p className="text-[11px] text-gray-400">
              Stay ahead! Add assignments, quizzes, and mid-sems here.
            </p>
            <button
              type="button"
              onClick={() => handleOpenModal('all')}
              className="mt-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-block cursor-pointer"
            >
              + Add First {filterTab === 'exams' ? 'Exam' : 'Task'}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
            {pendingTasks.map(task => {
              const course = task.course_id ? courseMap.get(task.course_id) : null;
              const status = getTaskDueStatus(task.due_at, task.done);
              const isExam = isExamType(task.type);

              return (
                <div
                  key={task.id}
                  className="py-2.5 flex items-start justify-between gap-3 group transition-colors"
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => toggleTaskDone(task.id, task.done)}
                      className="mt-0.5 w-4 h-4 rounded-md border border-gray-300 dark:border-gray-600 hover:border-indigo-600 flex items-center justify-center transition-colors flex-shrink-0 cursor-pointer"
                      title="Mark complete"
                    >
                      {task.done && <span className="w-2.5 h-2.5 bg-indigo-600 rounded-sm" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs sm:text-sm font-bold truncate ${
                            task.done
                              ? 'line-through text-gray-400 dark:text-gray-500'
                              : 'text-gray-900 dark:text-white'
                          }`}
                        >
                          {task.title}
                        </span>

                        <span
                          className={`text-[9.5px] uppercase font-black px-1.5 py-0.2 rounded-md ${
                            isExam
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                              : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300'
                          }`}
                        >
                          {getTaskTypeLabel(task.type)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 font-medium truncate">
                        {course && (
                          <span className="flex items-center gap-1 truncate">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: course.color || '#6366f1' }}
                            />
                            {course.code || course.name}
                          </span>
                        )}

                        {task.due_at && (
                          <span>
                            {formatDate(new Date(task.due_at), dateFormat)}
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

                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex-shrink-0 cursor-pointer ${status.color}`}
                    onClick={handleViewAll}
                  >
                    {status.shortLabel}
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
          initialMode={modalMode}
        />
      )}
    </>
  );
};
