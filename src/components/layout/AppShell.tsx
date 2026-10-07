import React from 'react';
import { Sidebar } from './Sidebar';
import { BottomNav, NavTab } from './BottomNav';
import { Header } from './Header';

export interface AppShellProps {
  children: React.ReactNode;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
  termName?: string;
  onOpenSemesterSwitcher?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTab,
  onTabChange,
  title,
  subtitle,
  isDark,
  onToggleTheme,
  termName,
  onOpenSemesterSwitcher,
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans antialiased text-gray-900 dark:text-gray-100 flex flex-col lg:flex-row">
      {/* 1. Desktop Left Sidebar (Visible at >= 1024px) */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        termName={termName}
        onOpenSemesterSwitcher={onOpenSemesterSwitcher}
      />

      {/* 2. Main Area (Mobile / Tablet / Desktop) */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile / Tablet Header (Hidden at >= 1024px) */}
        <div className="lg:hidden sticky top-0 z-30">
          <Header
            title={title}
            subtitle={subtitle}
            isDark={isDark}
            onToggleTheme={onToggleTheme}
            onOpenSemesterSwitcher={onOpenSemesterSwitcher}
          />
        </div>

        {/* Content Area with bottom padding on mobile for BottomNav */}
        <main className="flex-1 pb-20 lg:pb-8 overflow-y-auto">
          {children}
        </main>

        {/* Mobile / Tablet Bottom Navigation (Hidden at >= 1024px) */}
        <div className="lg:hidden">
          <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
        </div>
      </div>
    </div>
  );
};
