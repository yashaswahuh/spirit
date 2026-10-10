import React from 'react';
import {
  Home,
  CheckCircle2,
  Calendar,
  GraduationCap,
  MoreHorizontal,
  Sun,
  Moon,
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { CURRENT_APP_VERSION, CURRENT_SITE_VERSION } from '../../utils/updater';

export interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  termName?: string;
  onOpenSemesterSwitcher?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isDark,
  onToggleTheme,
  termName,
  onOpenSemesterSwitcher,
}) => {
  const navItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home, description: 'Dashboard & Today' },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: CheckCircle2, description: 'Subjects & Safe Bunks' },
    { id: 'timetable' as NavTab, label: 'Timetable', icon: Calendar, description: 'Weekly Schedule' },
    { id: 'grades' as NavTab, label: 'Grades', icon: GraduationCap, description: 'GPA & Performance' },
    { id: 'more' as NavTab, label: 'More', icon: MoreHorizontal, description: 'Settings & Storage' },
  ];

  return (
    <aside
      className="hidden lg:flex flex-col w-64 xl:w-72 bg-white dark:bg-gray-900 border-r border-gray-200/80 dark:border-gray-800 h-screen sticky top-0 flex-shrink-0 z-30 select-none justify-between"
      aria-label="Desktop Navigation Sidebar"
    >
      {/* Top Brand Section */}
      <div>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-indigo-200 dark:shadow-none flex-shrink-0">
              S
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-1.5 flex-wrap">
                Spirit
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-mono" title="Native Android APK Version">
                  v{CURRENT_APP_VERSION}
                </span>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 font-mono" title="Live Site / Web Bundle Version">
                  site v{CURRENT_SITE_VERSION}
                </span>
              </h1>
              {onOpenSemesterSwitcher ? (
                <button
                  type="button"
                  onClick={onOpenSemesterSwitcher}
                  className="text-xs text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 truncate flex items-center gap-1 transition-colors mt-0.5 text-left group cursor-pointer"
                  title="Click to switch or manage semesters"
                >
                  <span className="group-hover:underline truncate">{termName || 'Semester 1'}</span>
                  <span className="text-[10px] text-indigo-500 font-bold opacity-75 group-hover:opacity-100">&rarr;</span>
                </button>
              ) : (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {termName || 'Semester Dashboard'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5" aria-label="Main Navigation">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl font-medium text-sm transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none cursor-pointer ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs border border-indigo-100/80 dark:border-indigo-900/40'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-2'
                  }`}
                />
                <div className="text-left min-w-0 flex-1">
                  <span className="block leading-none">{item.label}</span>
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 font-normal leading-tight mt-0.5 block truncate">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Theme Toggle */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800/80">
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:outline-none min-h-[44px]"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          <span className="flex items-center gap-2">
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600" />
            )}
            <span>{isDark ? 'Light Theme' : 'Dark Theme'}</span>
          </span>
          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
            {isDark ? 'Dark' : 'Light'}
          </span>
        </button>

        <div className="mt-3 px-3.5 text-[11px] text-gray-400 dark:text-gray-500 flex items-center justify-between">
          <span>Local-First (Dexie)</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">Offline</span>
        </div>
      </div>
    </aside>
  );
};
