/**
 * Spirit Tasks & Exams Engine
 * Provides accurate countdown calculations, deadline categorizations,
 * filtering, grouping, and academic analytics for tasks and exams.
 */

import { Task, TaskType, TaskPriority } from '../types';

export interface TaskDueStatus {
  label: string;
  shortLabel: string;
  color: string;
  badgeVariant: 'overdue' | 'today' | 'tomorrow' | 'upcoming' | 'completed' | 'none';
  isOverdue: boolean;
  isDueToday: boolean;
  isDueTomorrow: boolean;
  diffMinutes: number | null;
  diffDays: number | null;
}

export interface TaskGroups {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  later: Task[];
  completed: Task[];
}

export interface TaskStats {
  total: number;
  pending: number;
  completed: number;
  overdue: number;
  dueToday: number;
  totalExams: number;
  upcomingExams: number;
  pendingAssignments: number;
  completionRate: number; // 0 to 100
}

export const EXAM_TASK_TYPES: ReadonlySet<TaskType> = new Set<TaskType>([
  'exam',
  'mid_sem',
  'end_sem',
  'quiz',
  'lab_exam',
]);

export function isExamType(type: TaskType): boolean {
  return EXAM_TASK_TYPES.has(type);
}

export function getTaskTypeLabel(type: TaskType): string {
  switch (type) {
    case 'mid_sem':
      return 'Mid-Sem Exam';
    case 'end_sem':
      return 'End-Sem Exam';
    case 'quiz':
      return 'Quiz / Test';
    case 'lab_exam':
      return 'Lab Practical';
    case 'exam':
      return 'Exam';
    case 'assignment':
      return 'Assignment';
    case 'project':
      return 'Project / Viva';
    case 'presentation':
      return 'Presentation';
    case 'other':
    default:
      return 'Task';
  }
}

export function parseTaskDueDate(dueAt: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dueAt)) {
    const [y, m, d] = dueAt.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
  }
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(dueAt)) {
    const [datePart, timePart] = dueAt.split('T');
    const [y, m, d] = datePart.split('-').map(Number);
    const [hh, mm, ss] = timePart.split(':').map(Number);
    return new Date(y, m - 1, d, hh, mm || 0, ss || 0);
  }
  return new Date(dueAt);
}

export function getTaskDueStatus(
  dueAt: string | null | undefined,
  done: boolean,
  now: Date = new Date()
): TaskDueStatus {
  if (done) {
    return {
      label: 'Completed',
      shortLabel: 'Done',
      color:
        'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60',
      badgeVariant: 'completed',
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffMinutes: null,
      diffDays: null,
    };
  }

  if (!dueAt) {
    return {
      label: 'No deadline',
      shortLabel: 'No date',
      color:
        'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
      badgeVariant: 'none',
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: false,
      diffMinutes: null,
      diffDays: null,
    };
  }

  const dueDate = parseTaskDueDate(dueAt);
  const nowTime = now.getTime();
  const dueTime = dueDate.getTime();
  const diffMs = dueTime - nowTime;
  const diffMinutes = Math.round(diffMs / 60000);

  const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dueDateOnly = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate()
  ).getTime();
  const calendarDayDiff = Math.round((dueDateOnly - nowDateOnly) / 86400000);

  // 1. Due on a previous calendar day -> Overdue by days
  if (calendarDayDiff < 0) {
    const overdueDays = Math.abs(calendarDayDiff);
    return {
      label: overdueDays === 1 ? 'Overdue by 1 day' : `Overdue by ${overdueDays} days`,
      shortLabel: `${overdueDays}d late`,
      color:
        'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold',
      badgeVariant: 'overdue',
      isOverdue: true,
      isDueToday: false,
      isDueTomorrow: false,
      diffMinutes,
      diffDays: calendarDayDiff,
    };
  }

  // 2. Due TODAY
  if (calendarDayDiff === 0) {
    if (diffMs < 0) {
      // Overdue today (time was earlier today)
      const absMins = Math.abs(diffMinutes);
      const absHours = Math.floor(absMins / 60);
      const label =
        absHours >= 1 ? `Overdue today by ${absHours}h` : `Overdue today by ${absMins}m`;
      const shortLabel = absHours >= 1 ? `${absHours}h late` : `${absMins}m late`;

      return {
        label,
        shortLabel,
        color:
          'text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-bold',
        badgeVariant: 'overdue',
        isOverdue: true,
        isDueToday: true,
        isDueTomorrow: false,
        diffMinutes,
        diffDays: 0,
      };
    }

    // Due later today
    const hoursLeft = Math.floor(diffMinutes / 60);
    let label = 'Due today';
    let shortLabel = 'Today';

    if (hoursLeft >= 1) {
      label = `Due today (${hoursLeft}h left)`;
      shortLabel = `${hoursLeft}h left`;
    } else if (diffMinutes > 0) {
      label = `Due in ${diffMinutes}m`;
      shortLabel = `${diffMinutes}m left`;
    } else {
      label = 'Due right now';
      shortLabel = 'Now';
    }

    return {
      label,
      shortLabel,
      color:
        'text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60 font-bold',
      badgeVariant: 'today',
      isOverdue: false,
      isDueToday: true,
      isDueTomorrow: false,
      diffMinutes,
      diffDays: 0,
    };
  }

  // 3. Due TOMORROW
  if (calendarDayDiff === 1) {
    return {
      label: 'Due tomorrow',
      shortLabel: 'Tomorrow',
      color:
        'text-amber-700 bg-amber-50/80 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-900/50 font-semibold',
      badgeVariant: 'tomorrow',
      isOverdue: false,
      isDueToday: false,
      isDueTomorrow: true,
      diffMinutes,
      diffDays: 1,
    };
  }

  // 4. Upcoming later (in 2+ days)
  return {
    label: `In ${calendarDayDiff} days`,
    shortLabel: `In ${calendarDayDiff}d`,
    color:
      'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/40 font-medium',
    badgeVariant: 'upcoming',
    isOverdue: false,
    isDueToday: false,
    isDueTomorrow: false,
    diffMinutes,
    diffDays: calendarDayDiff,
  };
}

export function groupTasks(tasks: Task[], now: Date = new Date()): TaskGroups {
  const groups: TaskGroups = {
    overdue: [],
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    completed: [],
  };

  for (const task of tasks) {
    if (task.done) {
      groups.completed.push(task);
      continue;
    }

    const status = getTaskDueStatus(task.due_at, false, now);

    if (status.isOverdue) {
      groups.overdue.push(task);
    } else if (status.isDueToday) {
      groups.today.push(task);
    } else if (status.isDueTomorrow) {
      groups.tomorrow.push(task);
    } else if (status.diffDays !== null && status.diffDays <= 7) {
      groups.thisWeek.push(task);
    } else {
      groups.later.push(task);
    }
  }

  const sortAsc = (a: Task, b: Task) => {
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  };

  groups.overdue.sort(sortAsc);
  groups.today.sort(sortAsc);
  groups.tomorrow.sort(sortAsc);
  groups.thisWeek.sort(sortAsc);
  groups.later.sort(sortAsc);
  groups.completed.sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  return groups;
}

export function calculateTaskStats(tasks: Task[], now: Date = new Date()): TaskStats {
  const total = tasks.length;
  let completed = 0;
  let overdue = 0;
  let dueToday = 0;
  let totalExams = 0;
  let upcomingExams = 0;

  for (const t of tasks) {
    const isExam = isExamType(t.type);
    if (isExam) totalExams++;

    if (t.done) {
      completed++;
    } else {
      if (isExam) upcomingExams++;
      const status = getTaskDueStatus(t.due_at, false, now);
      if (status.isOverdue) overdue++;
      if (status.isDueToday && !status.isOverdue) dueToday++;
    }
  }

  const pending = total - completed;
  const pendingAssignments = pending - upcomingExams;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    pending,
    completed,
    overdue,
    dueToday,
    totalExams,
    upcomingExams,
    pendingAssignments,
    completionRate,
  };
}

export interface FilterAndSortOptions {
  searchQuery?: string;
  categoryFilter?: 'all' | 'exams' | 'assignments' | 'pending' | 'completed' | 'urgent';
  courseIdFilter?: string | null;
  priorityFilter?: TaskPriority | 'all';
  sortBy?: 'due_date_asc' | 'due_date_desc' | 'priority' | 'course' | 'title';
  courseMap?: Map<string, { code?: string; name: string }>;
}

export function filterAndSortTasks(
  tasks: Task[],
  options: FilterAndSortOptions = {},
  now: Date = new Date()
): Task[] {
  const {
    searchQuery = '',
    categoryFilter = 'all',
    courseIdFilter = null,
    priorityFilter = 'all',
    sortBy = 'due_date_asc',
    courseMap,
  } = options;

  const query = searchQuery.trim().toLowerCase();

  const filtered = tasks.filter(task => {
    // 1. Course Filter
    if (courseIdFilter && task.course_id !== courseIdFilter) {
      return false;
    }

    // 2. Priority Filter
    if (priorityFilter && priorityFilter !== 'all') {
      if (task.priority !== priorityFilter) return false;
    }

    // 3. Category Filter
    if (categoryFilter === 'pending' && task.done) return false;
    if (categoryFilter === 'completed' && !task.done) return false;
    if (categoryFilter === 'exams') {
      if (!isExamType(task.type)) return false;
    }
    if (categoryFilter === 'assignments') {
      if (isExamType(task.type)) return false;
    }
    if (categoryFilter === 'urgent') {
      if (task.done) return false;
      const status = getTaskDueStatus(task.due_at, false, now);
      const isUrgentPriority = task.priority === 'urgent' || task.priority === 'high';
      if (!status.isOverdue && !status.isDueToday && !isUrgentPriority) {
        return false;
      }
    }

    // 4. Search Query Filter
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchVenue = (task.venue || '').toLowerCase().includes(query);
      const matchSyllabus = (task.syllabus || '').toLowerCase().includes(query);
      const matchNotes = (task.notes || '').toLowerCase().includes(query);
      const course = task.course_id && courseMap ? courseMap.get(task.course_id) : null;
      const matchCourse = course
        ? course.name.toLowerCase().includes(query) || (course.code || '').toLowerCase().includes(query)
        : false;

      if (!matchTitle && !matchVenue && !matchSyllabus && !matchNotes && !matchCourse) {
        return false;
      }
    }

    return true;
  });

  const priorityRank: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  return filtered.sort((a, b) => {
    if (categoryFilter !== 'completed' && a.done !== b.done) {
      return a.done ? 1 : -1;
    }

    if (sortBy === 'priority') {
      const pA = a.priority ? priorityRank[a.priority] || 0 : 0;
      const pB = b.priority ? priorityRank[b.priority] || 0 : 0;
      if (pA !== pB) return pB - pA;
    }

    if (sortBy === 'title') {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === 'course') {
      const cA = (a.course_id && courseMap?.get(a.course_id)?.name) || '';
      const cB = (b.course_id && courseMap?.get(b.course_id)?.name) || '';
      const cmp = cA.localeCompare(cB);
      if (cmp !== 0) return cmp;
    }

    if (sortBy === 'due_date_desc') {
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(b.due_at).getTime() - new Date(a.due_at).getTime();
    }

    // Default: due_date_asc
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });
}
