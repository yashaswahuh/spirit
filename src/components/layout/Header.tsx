import React from 'react';
import { Moon, Sun, CheckSquare } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  rightAction?: React.ReactNode;
  onOpenSemesterSwitcher?: () => void;
  onOpenTasks?: () => void;
  pendingTasksCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isDark,
  onToggleTheme,
  rightAction,
  onOpenSemesterSwitcher,
  onOpenTasks,
  pendingTasksCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 inline-block" />
          {title}
        </h1>
        {subtitle && (
          onOpenSemesterSwitcher ? (
            <button
              type="button"
              onClick={onOpenSemesterSwitcher}
              className="text-xs text-gray-500 dark:text-gray-400 font-medium hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 transition-colors text-left cursor-pointer"
              title="Change active semester"
            >
              <span>{subtitle}</span>
              <span className="text-[10px] text-indigo-500 font-bold">&#9662;</span>
            </button>
          ) : (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{subtitle}</p>
          )
        )}
      </div>

      <div className="flex items-center gap-2">
        {rightAction}

        {onOpenTasks && (
          <button
            type="button"
            onClick={onOpenTasks}
            className="relative p-2 rounded-xl text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Tasks and Exams"
            title="Tasks & Exams"
          >
            <CheckSquare className="w-4 h-4" />
            {pendingTasksCount !== undefined && pendingTasksCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-600 text-white min-w-[16px] text-center shadow-xs">
                {pendingTasksCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onToggleTheme}
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white bg-gray-100 dark:bg-gray-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>
    </header>
  );
};
