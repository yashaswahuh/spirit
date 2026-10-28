import { describe, it, expect } from 'vitest';
import {
  getTaskDueStatus,
  groupTasks,
  calculateTaskStats,
  filterAndSortTasks,
  isExamType,
  getTaskTypeLabel,
} from '../tasks';
import { Task } from '../../types';

describe('Tasks & Exams Engine', () => {
  const baseTask: Task = {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: '00000000-0000-0000-0000-000000000001',
    title: 'Operating Systems Assignment 1',
    type: 'assignment',
    due_at: '2026-10-28T18:00:00',
    course_id: 'cs101',
    done: false,
    created_at: '2026-10-20T10:00:00Z',
    updated_at: '2026-10-20T10:00:00Z',
    deleted_at: null,
  };

  const fixedNow = new Date(2026, 9, 28, 14, 0, 0); // Oct 28, 2026 at 14:00 (2:00 PM)

  describe('getTaskDueStatus', () => {
    it('returns Completed for done tasks regardless of date', () => {
      const status = getTaskDueStatus('2026-10-20T10:00:00', true, fixedNow);
      expect(status.badgeVariant).toBe('completed');
      expect(status.label).toBe('Completed');
      expect(status.isOverdue).toBe(false);
    });

    it('returns No deadline for null or empty due date', () => {
      const status = getTaskDueStatus(null, false, fixedNow);
      expect(status.badgeVariant).toBe('none');
      expect(status.label).toBe('No deadline');
      expect(status.isOverdue).toBe(false);
    });

    it('returns Due today (in Xh) when due later today', () => {
      // 4 hours in the future today (18:00 vs 14:00)
      const status = getTaskDueStatus('2026-10-28T18:00:00', false, fixedNow);
      expect(status.isDueToday).toBe(true);
      expect(status.isOverdue).toBe(false);
      expect(status.badgeVariant).toBe('today');
      expect(status.label).toBe('Due today (4h left)');
      expect(status.shortLabel).toBe('4h left');
    });

    it('returns Overdue today by Xh when due time was earlier today', () => {
      // 3 hours in the past today (11:00 vs 14:00)
      const status = getTaskDueStatus('2026-10-28T11:00:00', false, fixedNow);
      expect(status.isDueToday).toBe(true);
      expect(status.isOverdue).toBe(true);
      expect(status.badgeVariant).toBe('overdue');
      expect(status.label).toBe('Overdue today by 3h');
      expect(status.shortLabel).toBe('3h late');
    });

    it('returns Due tomorrow when due on the next calendar day', () => {
      const status = getTaskDueStatus('2026-10-29T10:00:00', false, fixedNow);
      expect(status.isDueTomorrow).toBe(true);
      expect(status.isDueToday).toBe(false);
      expect(status.isOverdue).toBe(false);
      expect(status.badgeVariant).toBe('tomorrow');
      expect(status.label).toBe('Due tomorrow');
    });

    it('returns In X days for dates further in the future', () => {
      const status = getTaskDueStatus('2026-11-02T10:00:00', false, fixedNow);
      expect(status.isOverdue).toBe(false);
      expect(status.badgeVariant).toBe('upcoming');
      expect(status.label).toBe('In 5 days');
    });

    it('returns Overdue by X days when due date was in the past', () => {
      const status = getTaskDueStatus('2026-10-25T10:00:00', false, fixedNow);
      expect(status.isOverdue).toBe(true);
      expect(status.badgeVariant).toBe('overdue');
      expect(status.label).toBe('Overdue by 3 days');
      expect(status.shortLabel).toBe('3d late');
    });
  });

  describe('groupTasks', () => {
    it('correctly partitions tasks into chronological groups', () => {
      const tasks: Task[] = [
        { ...baseTask, id: 't1', title: 'Overdue Past', due_at: '2026-10-25T10:00:00', done: false },
        { ...baseTask, id: 't2', title: 'Due Later Today', due_at: '2026-10-28T19:00:00', done: false },
        { ...baseTask, id: 't3', title: 'Due Tomorrow', due_at: '2026-10-29T14:00:00', done: false },
        { ...baseTask, id: 't4', title: 'Due in 4 Days', due_at: '2026-11-01T10:00:00', done: false },
        { ...baseTask, id: 't5', title: 'Due in 3 Weeks', due_at: '2026-11-20T10:00:00', done: false },
        { ...baseTask, id: 't6', title: 'Completed Item', due_at: '2026-10-27T10:00:00', done: true },
      ];

      const groups = groupTasks(tasks, fixedNow);

      expect(groups.overdue.map(t => t.id)).toEqual(['t1']);
      expect(groups.today.map(t => t.id)).toEqual(['t2']);
      expect(groups.tomorrow.map(t => t.id)).toEqual(['t3']);
      expect(groups.thisWeek.map(t => t.id)).toEqual(['t4']);
      expect(groups.later.map(t => t.id)).toEqual(['t5']);
      expect(groups.completed.map(t => t.id)).toEqual(['t6']);
    });
  });

  describe('calculateTaskStats', () => {
    it('calculates completion rate, pending, and overdue counts accurately', () => {
      const tasks: Task[] = [
        { ...baseTask, id: 't1', type: 'mid_sem', due_at: '2026-10-25T10:00:00', done: false }, // exam, overdue
        { ...baseTask, id: 't2', type: 'end_sem', due_at: '2026-10-28T20:00:00', done: false }, // exam, today
        { ...baseTask, id: 't3', type: 'assignment', due_at: '2026-11-01T10:00:00', done: true }, // done
        { ...baseTask, id: 't4', type: 'quiz', due_at: '2026-10-27T10:00:00', done: true }, // done
      ];

      const stats = calculateTaskStats(tasks, fixedNow);

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(2);
      expect(stats.completed).toBe(2);
      expect(stats.overdue).toBe(1);
      expect(stats.dueToday).toBe(1);
      expect(stats.totalExams).toBe(3);
      expect(stats.upcomingExams).toBe(2);
      expect(stats.completionRate).toBe(50);
    });
  });

  describe('filterAndSortTasks', () => {
    const tasks: Task[] = [
      { ...baseTask, id: 't1', title: 'Math Mid-Sem Exam', type: 'mid_sem', priority: 'urgent', due_at: '2026-10-29T10:00:00', course_id: 'math101' },
      { ...baseTask, id: 't2', title: 'Physics Lab Report', type: 'assignment', priority: 'medium', due_at: '2026-11-05T10:00:00', course_id: 'phys101' },
      { ...baseTask, id: 't3', title: 'DSA Project Viva', type: 'project', priority: 'high', due_at: '2026-11-01T10:00:00', course_id: 'cs101' },
      { ...baseTask, id: 't4', title: 'Done Task', type: 'assignment', priority: 'low', due_at: '2026-10-20T10:00:00', course_id: 'math101', done: true },
    ];

    it('filters by category exams', () => {
      const result = filterAndSortTasks(tasks, { categoryFilter: 'exams' }, fixedNow);
      expect(result.map(t => t.id)).toEqual(['t1']);
    });

    it('filters by category assignments', () => {
      const result = filterAndSortTasks(tasks, { categoryFilter: 'assignments' }, fixedNow);
      expect(result.map(t => t.id)).toEqual(['t3', 't2', 't4']);
    });

    it('filters by search query', () => {
      const result = filterAndSortTasks(tasks, { searchQuery: 'physics' }, fixedNow);
      expect(result.map(t => t.id)).toEqual(['t2']);
    });

    it('sorts by priority correctly', () => {
      const result = filterAndSortTasks(tasks, { sortBy: 'priority' }, fixedNow);
      // t1 (urgent), t3 (high), t2 (medium), t4 (done at end)
      expect(result.map(t => t.id)).toEqual(['t1', 't3', 't2', 't4']);
    });
  });

  describe('isExamType and labels', () => {
    it('recognizes exam task types', () => {
      expect(isExamType('exam')).toBe(true);
      expect(isExamType('mid_sem')).toBe(true);
      expect(isExamType('end_sem')).toBe(true);
      expect(isExamType('quiz')).toBe(true);
      expect(isExamType('lab_exam')).toBe(true);
      expect(isExamType('assignment')).toBe(false);
      expect(isExamType('project')).toBe(false);
    });

    it('provides friendly labels', () => {
      expect(getTaskTypeLabel('mid_sem')).toBe('Mid-Sem Exam');
      expect(getTaskTypeLabel('end_sem')).toBe('End-Sem Exam');
      expect(getTaskTypeLabel('assignment')).toBe('Assignment');
      expect(getTaskTypeLabel('lab_exam')).toBe('Lab Practical');
    });
  });
});

