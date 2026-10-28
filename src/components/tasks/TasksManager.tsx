import React, { useState, useMemo } from 'react';
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
  Clock,
  AlertCircle,
  Copy,
  Search,
  ChevronDown,
  ChevronUp,
  Tag,
  Award,
  Bell,
  BookOpen,
  GraduationCap,
  Check,
  X,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { Task, TaskType, TaskPriority, ExamClassMode } from '../../types';
import {
  createTask,
  updateTask,
  toggleTaskDone,
  deleteTask,
  duplicateTask,
  clearCompletedTasks,
  updateExamClassMode,
} from '../../db/repositories/task.repo';
import { addMinutesToTime } from '../../engine/timetable';
import {
  getTaskDueStatus,
  groupTasks,
  calculateTaskStats,
  filterAndSortTasks,
  isExamType,
  getTaskTypeLabel,
} from '../../engine/tasks';
import { useDateFormat, formatDateTime } from '../../utils/preferences';
import { CalendarExportModal } from '../timetable/CalendarExportModal';

interface TasksManagerProps {
  initialCourseIdFilter?: string | null;
  initialMode?: 'all' | 'exams' | 'assignments';
  onClose?: () => void;
  isModalView?: boolean;
}

export const TasksManager: React.FC<TasksManagerProps> = ({
  initialCourseIdFilter = null,
  initialMode = 'all',
  onClose,
  isModalView = false,
}) => {
  const dateFormat = useDateFormat();
  const rawTasks = useLiveQuery(() => db.task.filter(t => t.deleted_at === null).toArray()) || [];
  const courses = useLiveQuery(() => db.course.filter(c => c.deleted_at === null).toArray()) || [];
  const courseMap = useMemo(() => new Map(courses.map(c => [c.id, c])), [courses]);

  // View & Filter states
  const [activeCategory, setActiveCategory] = useState<
    'all' | 'exams' | 'assignments' | 'pending' | 'completed' | 'urgent'
  >(initialMode);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>(
    initialCourseIdFilter || ''
  );
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'due_date_asc' | 'due_date_desc' | 'priority' | 'course' | 'title'
  >('due_date_asc');

  // UI state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<string>>(new Set());
  const [copiedTaskId, setCopiedTaskId] = useState<string | null>(null);
  const [marksModalTaskId, setMarksModalTaskId] = useState<string | null>(null);
  const [obtainedMarksInput, setObtainedMarksInput] = useState<string>('');

  // Form State
  const [formMode, setFormMode] = useState<'task' | 'exam'>('task');
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TaskType>('assignment');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [endTime, setEndTime] = useState('11:00');
  const [examClassMode, setExamClassMode] = useState<ExamClassMode>('cancel_overlapping');
  const [courseId, setCourseId] = useState<string>(initialCourseIdFilter || '');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [venue, setVenue] = useState('');
  const [seatNumber, setSeatNumber] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [notes, setNotes] = useState('');
  const [maxMarks, setMaxMarks] = useState<string>('');
  const [weightage, setWeightage] = useState<string>('');
  const [reminderOffset, setReminderOffset] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Statistics
  const stats = useMemo(() => calculateTaskStats(rawTasks), [rawTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(rawTasks, {
      searchQuery,
      categoryFilter: activeCategory,
      courseIdFilter: selectedCourseFilter || null,
      priorityFilter: selectedPriorityFilter,
      sortBy,
      courseMap,
    });
  }, [
    rawTasks,
    searchQuery,
    activeCategory,
    selectedCourseFilter,
    selectedPriorityFilter,
    sortBy,
    courseMap,
  ]);

  // Grouped tasks (Overdue, Today, Tomorrow, This Week, Later, Completed)
  const groups = useMemo(() => groupTasks(filteredTasks), [filteredTasks]);

  const toggleExpand = (id: string) => {
    setExpandedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setTitle('');
    setType('assignment');
    setFormMode('task');
    setDueDate('');
    setDueTime('23:59');
    setEndTime('11:00');
    setExamClassMode('cancel_overlapping');
    setCourseId(selectedCourseFilter || '');
    setPriority('medium');
    setVenue('');
    setSeatNumber('');
    setSyllabus('');
    setNotes('');
    setMaxMarks('');
    setWeightage('');
    setReminderOffset(0);
    setEditingTaskId(null);
    setIsFormOpen(false);
  };

  const openAddForm = (mode: 'task' | 'exam' = 'task') => {
    resetForm();
    setFormMode(mode);
    if (mode === 'exam') {
      setType('mid_sem');
      setDueTime('10:00');
      setEndTime('11:00');
      setExamClassMode('cancel_overlapping');
    } else {
      setType('assignment');
      setDueTime('23:59');
      setEndTime('');
    }
    // Set default due date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDueDate(tomorrow.toISOString().slice(0, 10));
    setIsFormOpen(true);
  };

  const handleStartEdit = (task: Task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setType(task.type);
    setFormMode(isExamType(task.type) ? 'exam' : 'task');

    if (task.due_at) {
      const parts = task.due_at.split('T');
      setDueDate(parts[0] || '');
      setDueTime(parts[1] ? parts[1].slice(0, 5) : '23:59');
    } else {
      setDueDate('');
      setDueTime('23:59');
    }
    setEndTime(task.end_time || (task.due_at && task.due_at.includes('T') ? addMinutesToTime(task.due_at.slice(11, 16), 60) : '11:00'));
    setExamClassMode(task.exam_class_mode || 'cancel_overlapping');

    setCourseId(task.course_id || '');
    setPriority(task.priority || 'medium');
    setVenue(task.venue || '');
    setSeatNumber(task.seat_number || '');
    setSyllabus(task.syllabus || '');
    setNotes(task.notes || '');
    setMaxMarks(task.max_marks !== null && task.max_marks !== undefined ? String(task.max_marks) : '');
    setWeightage(
      task.weightage !== null && task.weightage !== undefined ? String(task.weightage) : ''
    );
    setReminderOffset(task.reminder_offset || 0);
    setIsFormOpen(true);
  };

  const handlePresetSelect = (presetType: TaskType, defaultTitle: string) => {
    setType(presetType);
    if (!title || title.trim() === '') {
      setTitle(defaultTitle);
    }
    if (isExamType(presetType)) {
      setFormMode('exam');
      if (dueTime === '23:59') setDueTime('10:00');
    } else {
      setFormMode('task');
    }
  };

  const handleQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setDueDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const dueAt = dueDate ? `${dueDate}T${dueTime || '23:59'}:00` : null;
      const numMaxMarks = maxMarks.trim() !== '' ? parseFloat(maxMarks) : null;
      const numWeightage = weightage.trim() !== '' ? parseFloat(weightage) : null;

      const isExam = isExamType(type);
      if (editingTaskId) {
        await updateTask(editingTaskId, {
          title: title.trim(),
          type,
          due_at: dueAt,
          end_time: isExam ? (endTime.trim() || null) : null,
          exam_class_mode: isExam ? examClassMode : null,
          course_id: courseId || null,
          priority,
          venue: venue.trim() || null,
          seat_number: seatNumber.trim() || null,
          syllabus: syllabus.trim() || null,
          notes: notes.trim() || null,
          max_marks: numMaxMarks,
          weightage: numWeightage,
          reminder_offset: reminderOffset > 0 ? reminderOffset : null,
        });
      } else {
        await createTask({
          title: title.trim(),
          type,
          due_at: dueAt,
          end_time: isExam ? (endTime.trim() || null) : null,
          exam_class_mode: isExam ? examClassMode : null,
          course_id: courseId || null,
          done: false,
          priority,
          venue: venue.trim() || null,
          seat_number: seatNumber.trim() || null,
          syllabus: syllabus.trim() || null,
          notes: notes.trim() || null,
          max_marks: numMaxMarks,
          weightage: numWeightage,
          reminder_offset: reminderOffset > 0 ? reminderOffset : null,
        });
      }

      resetForm();
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareTask = async (task: Task) => {
    const course = task.course_id ? courseMap.get(task.course_id) : null;
    const lines = [
      `📌 ${task.title}`,
      `Type: ${getTaskTypeLabel(task.type)}`,
      course ? `Subject: ${course.name} (${course.code || ''})` : null,
      task.due_at ? `Due: ${formatDateTime(task.due_at, dateFormat)}` : null,
      task.venue ? `Venue: ${task.venue}` : null,
      task.seat_number ? `Seat: ${task.seat_number}` : null,
      task.syllabus ? `Syllabus: ${task.syllabus}` : null,
      task.notes ? `Notes: ${task.notes}` : null,
    ]
      .filter(Boolean)
      .join('\n');

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(lines);
        setCopiedTaskId(task.id);
        setTimeout(() => setCopiedTaskId(null), 2500);
      } catch {
        // Ignore fallback
      }
    }
  };

  const handleSaveMarks = async () => {
    if (!marksModalTaskId) return;
    const val = obtainedMarksInput.trim() !== '' ? parseFloat(obtainedMarksInput) : null;
    await updateTask(marksModalTaskId, {
      obtained_marks: val,
      done: val !== null ? true : undefined,
    });
    setMarksModalTaskId(null);
    setObtainedMarksInput('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Summary Banner & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Total Pending</p>
            <p className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5">
              {stats.pending}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Due Today / Soon</p>
            <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
              {stats.dueToday}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Upcoming Exams</p>
            <p className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {stats.upcomingExams}
            </p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Overdue</p>
            <p
              className={`text-xl sm:text-2xl font-black mt-0.5 ${
                stats.overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400'
              }`}
            >
              {stats.overdue}
            </p>
          </div>
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              stats.overdue > 0
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats.total > 0 && (
        <div className="bg-white dark:bg-gray-900 p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-gray-600 dark:text-gray-300">Completion Progress</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {stats.completed} of {stats.total} completed ({stats.completionRate}%)
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${stats.completionRate}%` }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => (isFormOpen ? resetForm() : openAddForm('task'))}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isFormOpen ? 'Close Form' : '+ Add Task / Assignment'}
          </button>

          <button
            type="button"
            onClick={() => (isFormOpen && formMode === 'exam' ? resetForm() : openAddForm('exam'))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer"
          >
            <GraduationCap className="w-4 h-4" />
            + Add Exam / Test
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            title="Export deadlines and exam schedules to phone or desktop calendar (.ics)"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
            <span>Export to Calendar</span>
          </button>

          {stats.completed > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`Clear all ${stats.completed} completed tasks from history?`)) {
                  await clearCompletedTasks();
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
              title="Delete all finished tasks"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Done</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Add / Edit Task Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 bg-gray-50 dark:bg-gray-800/80 rounded-3xl border border-indigo-100 dark:border-indigo-950 shadow-sm space-y-4 animate-fade-in"
        >
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                {formMode === 'exam' ? (
                  <GraduationCap className="w-4 h-4" />
                ) : (
                  <CheckSquare className="w-4 h-4" />
                )}
              </span>
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {editingTaskId
                  ? formMode === 'exam'
                    ? 'Edit Exam / Test'
                    : 'Edit Task / Assignment'
                  : formMode === 'exam'
                  ? 'Add Exam / Test Schedule'
                  : 'Add Assignment / Task'}
              </h4>
            </div>

            {/* Form Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-gray-200 dark:bg-gray-700">
              <button
                type="button"
                onClick={() => {
                  setFormMode('task');
                  setType('assignment');
                  setDueTime('23:59');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formMode === 'task'
                    ? 'bg-white dark:bg-gray-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Assignment
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormMode('exam');
                  setType('mid_sem');
                  setDueTime('10:00');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  formMode === 'exam'
                    ? 'bg-white dark:bg-gray-900 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-gray-600 dark:text-gray-300'
                }`}
              >
                Exam / Test
              </button>
            </div>
          </div>

          {/* Quick Presets Strip */}
          <div>
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              Quick Presets:
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {formMode === 'exam' ? (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('mid_sem', 'Mid-Sem Exam 1')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-amber-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    🎯 Mid-Sem Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('end_sem', 'End-Sem Final Exam')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-amber-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    🏆 End-Sem Exam
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('quiz', 'Quiz / Class Test')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-amber-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    ⚡ Quiz / Test
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('lab_exam', 'Lab Practical & Viva')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-amber-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    🔬 Lab Practical Exam
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('assignment', 'Assignment Submission')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    📝 Assignment
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('project', 'Project Submission & Viva')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    💻 Project / Capstone
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('presentation', 'Presentation & Seminar')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    📊 Presentation
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePresetSelect('other', 'Lab Record Submission')}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 text-gray-700 dark:text-gray-200 transition-colors"
                  >
                    📋 Lab Record
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Title */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Title / Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={
                  formMode === 'exam'
                    ? 'e.g. Mid-Sem Exam 1 or End-Sem Theory'
                    : 'e.g. DSA Assignment 2 or Lab Record Submission'
                }
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Course Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Related Course / Subject
              </label>
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="">General (No specific course)</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.code ? `[${c.code}] ` : ''}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due Date & Quick Selectors */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                  {formMode === 'exam' ? 'Exam Date *' : 'Due Date *'}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleQuickDate(0)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(1)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(3)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickDate(7)}
                    className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 hover:bg-indigo-600 hover:text-white transition-colors"
                  >
                    Next Week
                  </button>
                </div>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Due Time / Start Time */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {formMode === 'exam' ? 'Start Time' : 'Due Time'}
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={e => {
                  setDueTime(e.target.value);
                  if (formMode === 'exam') {
                    setEndTime(addMinutesToTime(e.target.value, 60));
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Exam End Time & Duration Shortcuts */}
            {formMode === 'exam' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                    End Time
                  </label>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '1h', mins: 60 },
                      { label: '1.5h', mins: 90 },
                      { label: '2h', mins: 120 },
                      { label: '3h', mins: 180 },
                    ].map(d => (
                      <button
                        key={d.label}
                        type="button"
                        onClick={() => setEndTime(addMinutesToTime(dueTime || '10:00', d.mins))}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-200 dark:bg-gray-700 hover:bg-amber-600 hover:text-white transition-colors cursor-pointer"
                      >
                        +{d.label}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="urgent">🔴 Urgent / Critical</option>
                <option value="high">🟠 High</option>
                <option value="medium">🔵 Medium</option>
                <option value="low">⚪ Low</option>
              </select>
            </div>

            {/* Exam Day Regular Classes Policy Selector */}
            {formMode === 'exam' && (
              <div className="sm:col-span-2 lg:col-span-3 bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-900/60 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white">
                    🎓 Regular Classes on Exam Day ({dueDate || 'Exam Date'})
                  </label>
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    Automatically manages timetable & attendance
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  Select what happens to your regular classes during this exam:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setExamClassMode('cancel_overlapping')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      examClassMode === 'cancel_overlapping'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>🔕 Cancel Overlapping Class</span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${
                        examClassMode === 'cancel_overlapping' ? 'bg-amber-800 text-white' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        Recommended
                      </span>
                    </div>
                    <p className={`text-[11px] mt-1 ${examClassMode === 'cancel_overlapping' ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      Classes continue as usual. Any class during exam time (${dueTime || '10:00'} - ${endTime || '11:00'}) is cancelled so you aren't marked absent.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamClassMode('substitute_exam')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      examClassMode === 'substitute_exam'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-bold text-xs">
                      🔄 Substitute with Exam Slot
                    </div>
                    <p className={`text-[11px] mt-1 ${examClassMode === 'substitute_exam' ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      The regular class during exam time is substituted by this Exam slot so you can log exam attendance.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamClassMode('suspend_all')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      examClassMode === 'suspend_all'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-bold text-xs">
                      🛑 Suspend All Classes (Full Exam Day)
                    </div>
                    <p className={`text-[11px] mt-1 ${examClassMode === 'suspend_all' ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      No regular lectures are conducted all day. Only this exam takes place.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExamClassMode('keep_all')}
                    className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                      examClassMode === 'keep_all'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-bold text-xs">
                      📚 Classes Run Normally
                    </div>
                    <p className={`text-[11px] mt-1 ${examClassMode === 'keep_all' ? 'text-amber-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      All regular lectures take place as scheduled alongside the exam.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Venue (Exam Hall or Submission Location) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                {formMode === 'exam' ? 'Exam Venue / Hall' : 'Venue / Submission Link'}
              </label>
              <input
                type="text"
                value={venue}
                onChange={e => setVenue(e.target.value)}
                placeholder={formMode === 'exam' ? 'e.g. Hall 302 or CSE Lab 2' : 'e.g. Google Classroom / Desk'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Seat Number (For Exams) */}
            {formMode === 'exam' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Seat / Desk Number
                </label>
                <input
                  type="text"
                  value={seatNumber}
                  onChange={e => setSeatNumber(e.target.value)}
                  placeholder="e.g. Row 3, Seat 24"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            )}

            {/* Max Marks & Weightage */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Max Marks (Optional)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={maxMarks}
                onChange={e => setMaxMarks(e.target.value)}
                placeholder="e.g. 50 or 100"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Weightage % (Optional)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={weightage}
                onChange={e => setWeightage(e.target.value)}
                placeholder="e.g. 20 (means 20%)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Reminder Offset */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Notification Reminder
              </label>
              <select
                value={reminderOffset}
                onChange={e => setReminderOffset(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value={0}>No automatic reminder</option>
                <option value={15}>15 minutes before</option>
                <option value={60}>1 hour before</option>
                <option value={1440}>1 day before (24 hours)</option>
                <option value={2880}>2 days before (48 hours)</option>
              </select>
            </div>

            {/* Syllabus / Modules */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Syllabus / Topics Covered
              </label>
              <input
                type="text"
                value={syllabus}
                onChange={e => setSyllabus(e.target.value)}
                placeholder="e.g. Units 1, 2 and 3; Dynamic Programming, Trees & B-Trees"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Special Instructions / Notes
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Bring college ID card, scientific calculator permitted, submit in PDF format."
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              {editingTaskId ? 'Save Changes' : formMode === 'exam' ? 'Save Exam' : 'Save Task'}
            </button>
          </div>
        </form>
      )}

      {/* 4. Search & Filter Bar */}
      <div className="p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-xs space-y-3">
        {/* Search Input & Course Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, syllabus, venue, or subject..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <select
              value={selectedCourseFilter}
              onChange={e => setSelectedCourseFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Subjects</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>
                  {c.code || c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPriorityFilter}
              onChange={e => setSelectedPriorityFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔴 Urgent</option>
              <option value="high">🟠 High</option>
              <option value="medium">🔵 Medium</option>
              <option value="low">⚪ Low</option>
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="due_date_asc">Soonest Due</option>
              <option value="priority">Priority First</option>
              <option value="due_date_desc">Latest Due</option>
              <option value="course">By Subject</option>
              <option value="title">By Title</option>
            </select>
          </div>
        </div>

        {/* Filter Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {[
            { id: 'all', label: 'All Items', count: stats.total },
            { id: 'pending', label: 'Pending', count: stats.pending },
            { id: 'exams', label: '🎓 Exams & Tests', count: stats.totalExams },
            {
              id: 'assignments',
              label: '📝 Assignments',
              count: stats.total - stats.totalExams,
            },
            { id: 'urgent', label: '⚠️ Urgent / Overdue', count: stats.overdue },
            { id: 'completed', label: '✅ Completed', count: stats.completed },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`ml-1.5 text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. Grouped Task Lists */}
      <div className="space-y-6">
        {filteredTasks.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                No tasks or exams match your filter
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Keep your college life organized! Add homework, mid-sems, quizzes, and viva schedules.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => openAddForm('task')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                + Add Assignment
              </button>
              <button
                type="button"
                onClick={() => openAddForm('exam')}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all"
              >
                + Add Exam
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* OVERDUE SECTION */}
            {groups.overdue.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                  <AlertCircle className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Overdue ({groups.overdue.length})
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {groups.overdue.map(task => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* DUE TODAY SECTION */}
            {groups.today.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Due Today ({groups.today.length})
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {groups.today.map(task => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* DUE TOMORROW SECTION */}
            {groups.tomorrow.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                  <Calendar className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Due Tomorrow ({groups.tomorrow.length})
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {groups.tomorrow.map(task => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* THIS WEEK SECTION */}
            {groups.thisWeek.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Upcoming This Week ({groups.thisWeek.length})
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {groups.thisWeek.map(task => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* LATER SECTION */}
            {groups.later.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    Later in the Term ({groups.later.length})
                  </h4>
                </div>
                <div className="space-y-2.5">
                  {groups.later.map(task => renderTaskCard(task))}
                </div>
              </div>
            )}

            {/* COMPLETED SECTION (COLLAPSIBLE) */}
            {groups.completed.length > 0 && (
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2.5">
                <button
                  type="button"
                  onClick={() => setIsCompletedSectionOpen(prev => !prev)}
                  className="flex items-center justify-between w-full text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-900 dark:hover:text-white"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Completed Items ({groups.completed.length})</span>
                  </div>
                  {isCompletedSectionOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isCompletedSectionOpen && (
                  <div className="space-y-2.5 animate-fade-in">
                    {groups.completed.map(task => renderTaskCard(task))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Done Modal Button */}
      {isModalView && onClose && (
        <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
          >
            Done
          </button>
        </div>
      )}

      {/* Log Marks Quick Modal */}
      {marksModalTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-xl max-w-sm w-full space-y-4 animate-scale-up">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                Log Your Obtained Marks
              </h4>
              <button
                type="button"
                onClick={() => setMarksModalTaskId(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Record the marks you obtained on this assessment.
            </p>
            <div>
              <input
                type="number"
                min="0"
                step="0.5"
                value={obtainedMarksInput}
                onChange={e => setObtainedMarksInput(e.target.value)}
                placeholder="e.g. 42.5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMarksModalTaskId(null)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMarks}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Marks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Export Modal */}
      {isExportModalOpen && (
        <CalendarExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          exportType="tasks"
          tasks={rawTasks}
          courses={courses}
        />
      )}

      {/* Mobile Floating Action Button (FAB) for instant one-thumb access */}
      {!isModalView && !isFormOpen && (
        <div className="fixed bottom-20 right-4 z-30 lg:hidden flex flex-col items-end gap-2 animate-fade-in">
          <button
            type="button"
            onClick={() => openAddForm('task')}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
            aria-label="Add new task or exam"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Add Task / Exam</span>
          </button>
        </div>
      )}
    </div>
  );

  // Helper to render individual task card
  function renderTaskCard(task: Task) {
    const course = task.course_id ? courseMap.get(task.course_id) : null;
    const status = getTaskDueStatus(task.due_at, task.done);
    const isExpanded = expandedTaskIds.has(task.id);
    const isExam = isExamType(task.type);

    return (
      <div
        key={task.id}
        className={`p-4 rounded-2xl border transition-all ${
          task.done
            ? 'bg-gray-50/60 dark:bg-gray-800/20 border-gray-100 dark:border-gray-800 opacity-65'
            : status.isOverdue
            ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60 shadow-xs'
            : isExam
            ? 'bg-white dark:bg-gray-900 border-amber-200/60 dark:border-amber-900/40 shadow-xs'
            : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-xs hover:border-indigo-100 dark:hover:border-indigo-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          {/* Checkbox and main info */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={() => toggleTaskDone(task.id, !task.done)}
              className={`mt-0.5 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                task.done
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}
              aria-label={task.done ? 'Mark task as incomplete' : 'Mark task as completed'}
            >
              {task.done && <Check className="w-3.5 h-3.5 stroke-[3]" />}
            </button>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h5
                  className={`text-xs sm:text-sm font-bold truncate ${
                    task.done
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {task.title}
                </h5>

                {/* Type Badge */}
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                    isExam
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                  }`}
                >
                  {getTaskTypeLabel(task.type)}
                </span>

                {/* Priority Badge */}
                {task.priority && task.priority !== 'medium' && (
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                      task.priority === 'urgent'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        : task.priority === 'high'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {task.priority}
                  </span>
                )}
              </div>

              {/* Course & Date Row */}
              <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                {course && (
                  <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: course.color || '#6366f1' }}
                    />
                    <span>{course.code || course.name}</span>
                  </span>
                )}

                {task.due_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>
                      {formatDateTime(task.due_at, dateFormat)}
                      {isExam && task.end_time ? ` - ${task.end_time}` : ''}
                    </span>
                  </span>
                )}

                {isExam && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/40">
                    {task.exam_class_mode === 'suspend_all' && '🛑 Full Exam Day'}
                    {task.exam_class_mode === 'substitute_exam' && '🔄 Substituted with Exam'}
                    {task.exam_class_mode === 'keep_all' && '📚 Classes Run Normally'}
                    {(!task.exam_class_mode || task.exam_class_mode === 'cancel_overlapping') && '🔕 Overlapping Class Cancelled'}
                  </span>
                )}

                {task.venue && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="truncate max-w-[150px]">{task.venue}</span>
                  </span>
                )}

                {task.seat_number && (
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                    <Tag className="w-3 h-3" />
                    <span>Seat: {task.seat_number}</span>
                  </span>
                )}

                {task.max_marks && (
                  <span className="flex items-center gap-1 font-medium text-gray-500">
                    <Award className="w-3 h-3" />
                    <span>
                      {task.obtained_marks !== null && task.obtained_marks !== undefined
                        ? `Score: ${task.obtained_marks}/${task.max_marks}`
                        : `${task.max_marks} marks`}
                    </span>
                  </span>
                )}

                {task.reminder_offset && task.reminder_offset > 0 && (
                  <span
                    className="flex items-center gap-0.5 text-indigo-500"
                    title={`Reminder active ${task.reminder_offset}m before`}
                  >
                    <Bell className="w-3 h-3" />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right Action & Status Badge */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${status.color}`}>
              {status.shortLabel}
            </span>

            {/* Quick Actions Dropdown / Buttons */}
            <button
              type="button"
              onClick={() => handleStartEdit(task)}
              className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1"
              title="Edit Task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => toggleExpand(task.id)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1"
              title={isExpanded ? 'Hide Details' : 'View Details'}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Expandable Details Tray */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs space-y-2.5 animate-fade-in">
            {task.syllabus && (
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl">
                <BookOpen className="w-3.5 h-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Syllabus: </span>
                  <span className="text-gray-600 dark:text-gray-400">{task.syllabus}</span>
                </div>
              </div>
            )}

            {task.notes && (
              <div className="flex items-start gap-2 bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl">
                <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold text-gray-700 dark:text-gray-300">Notes: </span>
                  <span className="text-gray-600 dark:text-gray-400">{task.notes}</span>
                </div>
              </div>
            )}

            {/* 1-Tap Policy Switcher for Exams */}
            {isExam && (
              <div className="p-2.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-gray-700 dark:text-gray-300">
                    Exam Day Classes Policy:
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                    {task.exam_class_mode === 'suspend_all' && '🛑 Full Exam Day'}
                    {task.exam_class_mode === 'substitute_exam' && '🔄 Substituted with Exam'}
                    {task.exam_class_mode === 'keep_all' && '📚 Classes Run Normally'}
                    {(!task.exam_class_mode || task.exam_class_mode === 'cancel_overlapping') && '🔕 Overlapping Class Cancelled'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['cancel_overlapping', 'substitute_exam', 'suspend_all', 'keep_all'] as ExamClassMode[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => updateExamClassMode(task.id, m)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        (task.exam_class_mode || 'cancel_overlapping') === m
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {m === 'cancel_overlapping' && '🔕 Cancel Overlap'}
                      {m === 'substitute_exam' && '🔄 Substitute'}
                      {m === 'suspend_all' && '🛑 Suspend All'}
                      {m === 'keep_all' && '📚 Keep All'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar inside Expanded View */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleShareTask(task)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-[11px] font-semibold transition-colors"
                >
                  {copiedTaskId === task.id ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Details</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => duplicateTask(task.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-[11px] font-semibold transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMarksModalTaskId(task.id);
                    setObtainedMarksInput(
                      task.obtained_marks !== null && task.obtained_marks !== undefined
                        ? String(task.obtained_marks)
                        : ''
                    );
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
                >
                  <Award className="w-3 h-3" />
                  <span>{task.obtained_marks !== null ? 'Edit Score' : 'Log Score'}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Delete "${task.title}"?`)) {
                    deleteTask(task.id);
                  }
                }}
                className="text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
};
