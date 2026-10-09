import React from 'react';
import { Home, CheckCircle2, Calendar, GraduationCap, MoreHorizontal } from 'lucide-react';

export type NavTab = 'home' | 'attendance' | 'timetable' | 'grades' | 'more';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'attendance' as NavTab, label: 'Attendance', icon: CheckCircle2 },
    { id: 'timetable' as NavTab, label: 'Timetable', icon: Calendar },
    { id: 'grades' as NavTab, label: 'Grades', icon: GraduationCap },
    { id: 'more' as NavTab, label: 'More', icon: MoreHorizontal },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/80 dark:border-gray-800 shadow-lg shadow-black/5"
      aria-label="Bottom Navigation"
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-1.5 pb-[max(env(safe-area-inset-bottom,0px),0.5rem)] min-h-[64px]">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] rounded-2xl transition-all cursor-pointer ${
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium'
              }`}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`p-1 rounded-xl transition-all ${
                isActive ? 'bg-indigo-50 dark:bg-indigo-950/60' : ''
              }`}>
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? 'scale-110 stroke-[2.5]' : 'stroke-[1.75]'
                  }`}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] mt-0.5 tracking-tight font-medium leading-none">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
