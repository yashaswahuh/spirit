import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CheckSquare,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  CheckCircle2,
  FileText,
  Calendar,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { TaskType, Course, Task } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { createTask, updateTask, toggleTaskDone, deleteTask } from '../../db/repositories/task.repo';
import { useDateFormat, formatDateTime } from '../../utils/preferences';

interface TasksTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses: Course[];
}

export const TasksTrackerModal: React.FC<TasksTrackerModalProps> = ({
  isOpen,
  onClose,
  courses,
}) => {
  const dateFormat = useDateFormat();
  const tasks = useLiveQuery(() => db.task.filter(t => t.deleted_at === null).toArray()) || [];

  const [activeFilter, setActiveFilter] = useState<'all' | 'exams' | 'assignments' | 'pending' | 'completed'>('all');
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Task form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [courseId, setCourseId] = useState<string>('');
  const [syllabus, setSyllabus] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setTitle('');
    setType('assignment');
    setDueDate('');
    setDueTime('23:59');
    setCourseId('');
    setSyllabus('');
    setVenue('');
    setNotes('');
    setEditingTaskId(null);
    setIsAdding(false);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setType(task.type);
    if (task.due_at) {
      const parts = task.due_at.split('T');
      setDueDate(parts[0] || '');
      setDueTime(parts[1] ? parts[1].slice(0, 5) : '23:59');
    } else {
      setDueDate('');
      setDueTime('23:59');
    }
    setCourseId(task.course_id || '');
    setSyllabus(task.syllabus || '');
    setVenue(task.venue || '');
    setNotes(task.notes || '');
    setIsAdding(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const dueAt = dueDate ? `${dueDate}T${dueTime || '23:59'}:00` : null;

      if (editingTaskId) {
        await updateTask(editingTaskId, {
          title: title.trim(),
          type,
          due_at: dueAt,
          course_id: courseId || null,
          syllabus: syllabus.trim() || null,
          venue: venue.trim() || null,
          notes: notes.trim() || null,
        });
      } else {
        await createTask({
          title: title.trim(),
          type,
          due_at: dueAt,
          course_id: courseId || null,
          done: false,
          syllabus: syllabus.trim() || null,
          venue: venue.trim() || null,
          notes: notes.trim() || null,
        });
      }

      resetForm();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to compute countdown and overdue state
  const getDueStatus = (dueAt: string | null, done: boolean) => {
    if (done) return { label: 'Completed', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300', isOverdue: false };
    if (!dueAt) return { label: 'No deadline', color: 'text-gray-500 bg-gray-100 dark:bg-gray-800', isOverdue: false };

    const due = new Date(dueAt).getTime();
    const now = Date.now();
    const diffMs = due - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      const overdueDays = Math.abs(diffDays);
      return {
        label: overdueDays === 0 ? 'Overdue today' : `Overdue by ${overdueDays}d`,
        color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900',
        isOverdue: true,
      };
    } else if (diffDays === 0) {
      return { label: 'Due today', color: 'text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 font-bold', isOverdue: false };
    } else if (diffDays === 1) {
      return { label: 'Due tomorrow', color: 'text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300', isOverdue: false };
    } else {
      return { label: `In ${diffDays} days`, color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300', isOverdue: false };
    }
  };

  // Filter tasks
  const filteredTasks = tasks
    .filter(t => {
      if (activeFilter === 'pending') return !t.done;
      if (activeFilter === 'completed') return t.done;
      if (activeFilter === 'exams') return t.type === 'exam' || t.type === 'mid_sem' || t.type === 'end_sem' || t.type === 'quiz';
      if (activeFilter === 'assignments') return t.type === 'assignment' || t.type === 'project';
      return true;
    })
    .sort((a, b) => {
      // Pending first, then by due date
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
    });

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tasks, Exams & Deadlines"
      description="Track assignments, mid-sems, quizzes, venues, syllabus, and countdowns."
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* Header Controls & Filter Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(['all', 'pending', 'exams', 'assignments', 'completed'] as const).map(filter => (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap capitalize transition-all ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800/60'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (isAdding) {
                resetForm();
              } else {
                setIsAdding(true);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            {isAdding ? 'Close Form' : 'Add Task / Exam'}
          </button>
        </div>

        {/* Add / Edit Task / Exam Form */}
        {isAdding && (
          <form
            onSubmit={handleSubmitTask}
            className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/60 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                {editingTaskId ? 'Edit Task or Exam' : 'Create Task or Exam'}
              </h4>
              {editingTaskId && (
                <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold px-2 py-0.5 rounded">
                  Editing
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Title / Name
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Mid-Sem Exam 1 or DSA Assignment 2"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as TaskType)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz / Class Test</option>
                  <option value="mid_sem">Mid-Sem Exam</option>
                  <option value="end_sem">End-Sem Exam</option>
                  <option value="exam">Other Exam</option>
                  <option value="project">Project / Viva</option>
                  <option value="other">General Task</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Related Course
                </label>
                <select
                  value={courseId}
                  onChange={e => setCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">General (No specific course)</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code || 'NO-CODE'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Due Time
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Venue (Exam Hall / Lab)
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={e => setVenue(e.target.value)}
                  placeholder="e.g. Hall B-204"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Syllabus / Topics
                </label>
                <input
                  type="text"
                  value={syllabus}
                  onChange={e => setSyllabus(e.target.value)}
                  placeholder="e.g. Modules 1, 2 and 3"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Additional instructions, calculator allowed, etc."
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                {editingTaskId ? 'Update Task' : 'Save'}
              </button>
            </div>
          </form>
        )}

        {/* Tasks List */}
        <div className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-2">
              <CheckSquare className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
                No tasks or exams found.
              </p>
              <p className="text-[11px] text-gray-400">
                Tap "+ Add Task / Exam" to log your upcoming assignments and tests.
              </p>
            </div>
          ) : (
            filteredTasks.map(task => {
              const status = getDueStatus(task.due_at, task.done);
              const course = courses.find(c => c.id === task.course_id);

              return (
                <div
                  key={task.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    task.done
                      ? 'bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-60'
                      : status.isOverdue
                      ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
                      : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleTaskDone(task.id, !task.done)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                        task.done
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-600'
                      }`}
                    >
                      {task.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h5
                          className={`text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate ${
                            task.done ? 'line-through text-gray-400 dark:text-gray-500' : ''
                          }`}
                        >
                          {task.title}
                        </h5>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                          {task.type.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-medium">
                        {course && (
                          <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: course.color || '#6366f1' }}
                            />
                            {course.code || course.name}
                          </span>
                        )}

                        {task.venue && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <MapPin className="w-3 h-3 text-gray-400" />
                            {task.venue}
                          </span>
                        )}

                        {task.syllabus && (
                          <span className="flex items-center gap-1 text-gray-500">
                            <FileText className="w-3 h-3 text-gray-400" />
                            {task.syllabus}
                          </span>
                        )}

                        {task.due_at && (
                          <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-medium">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            {formatDateTime(task.due_at, dateFormat)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${status.color}`}>
                      {status.label}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(task)}
                      className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
                      title="Edit Task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

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
  );
};
