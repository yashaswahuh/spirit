import React from 'react';
import { PageContainer } from '../components/layout/PageContainer';
import { TasksManager } from '../components/tasks/TasksManager';

export const TasksScreen: React.FC = () => {
  return (
    <PageContainer maxWidth="xl">
      <div className="py-2 space-y-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Tasks, Exams & Schedules
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Keep track of homework assignments, quizzes, mid-sems, practicals, venues, and deadlines.
          </p>
        </div>

        <TasksManager isModalView={false} />
      </div>
    </PageContainer>
  );
};
