import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/dexie';
import { AppShell } from './components/layout/AppShell';
import { NavTab } from './components/layout/BottomNav';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { HomeScreen } from './screens/HomeScreen';
import { AttendanceScreen } from './screens/AttendanceScreen';
import { TimetableScreen } from './screens/TimetableScreen';
import { GradesScreen } from './screens/GradesScreen';
import { MoreScreen } from './screens/MoreScreen';

const MainApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Dark mode state
  const [isDark, setIsDark] = useState(() => {
    return (
      localStorage.getItem('spirit_theme') === 'dark' ||
      (!('spirit_theme' in localStorage) &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('spirit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('spirit_theme', 'light');
    }
  }, [isDark]);

  // Check if profile exists
  const profiles = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).toArray());
  const activeTerm = useLiveQuery(() => db.term.filter(t => t.deleted_at === null && t.status === 'ongoing').first());

  // Determine current active tab from hash path
  const currentPath = location.pathname.replace(/^\//, '') || 'home';
  const validTabs: NavTab[] = ['home', 'attendance', 'timetable', 'grades', 'more'];
  const activeTab: NavTab = validTabs.includes(currentPath as NavTab)
    ? (currentPath as NavTab)
    : 'home';

  const handleTabChange = (tab: NavTab) => {
    navigate(`/${tab}`);
  };

  // Header titles
  const getHeaderInfo = () => {
    switch (activeTab) {
      case 'attendance':
        return { title: 'Attendance', subtitle: activeTerm?.name };
      case 'timetable':
        return { title: 'Timetable', subtitle: 'Weekly Schedule' };
      case 'grades':
        return { title: 'Grades', subtitle: 'Academic Performance' };
      case 'more':
        return { title: 'More', subtitle: 'Settings & Data' };
      case 'home':
      default:
        return { title: 'Spirit', subtitle: activeTerm?.name || 'Dashboard' };
    }
  };

  const headerInfo = getHeaderInfo();

  // If query is in-flight (Dexie initializing)
  if (profiles === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  // If no profile exists yet, show Onboarding Wizard
  if (profiles.length === 0) {
    return <OnboardingWizard onComplete={() => navigate('/home')} />;
  }

  return (
    <AppShell
      activeTab={activeTab}
      onTabChange={handleTabChange}
      title={headerInfo.title}
      subtitle={headerInfo.subtitle}
      isDark={isDark}
      onToggleTheme={() => setIsDark(!isDark)}
      termName={activeTerm?.name}
    >
      <Routes>
        <Route path="/" element={<HomeScreen onNavigateToAttendance={() => handleTabChange('attendance')} />} />
        <Route path="/home" element={<HomeScreen onNavigateToAttendance={() => handleTabChange('attendance')} />} />
        <Route path="/attendance" element={<AttendanceScreen />} />
        <Route path="/timetable" element={<TimetableScreen />} />
        <Route path="/grades" element={<GradesScreen />} />
        <Route path="/more" element={<MoreScreen isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} onResetApp={() => navigate('/')} />} />
      </Routes>
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <HashRouter>
      <MainApp />
    </HashRouter>
  );
};

export default App;
