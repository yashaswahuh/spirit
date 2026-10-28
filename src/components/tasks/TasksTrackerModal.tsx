import React from 'react';
import { Course } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { TasksManager } from './TasksManager';

interface TasksTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  courses?: Course[];
  initialCourseIdFilter?: string | null;
  initialMode?: 'all' | 'exams' | 'assignments';
}

export const TasksTrackerModal: React.FC<TasksTrackerModalProps> = ({
  isOpen,
  onClose,
  initialCourseIdFilter,
  initialMode = 'all',
}) => {
  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Tasks, Exams & Deadlines"
      description="Track homework, quizzes, mid-sems, end-sems, syllabus, venues, and reminders."
      maxWidth="3xl"
    >
      <TasksManager
        initialCourseIdFilter={initialCourseIdFilter}
        initialMode={initialMode}
        onClose={onClose}
        isModalView={true}
      />
    </ResponsiveDialog>
  );
};
