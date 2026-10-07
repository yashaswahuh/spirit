import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/dexie';
import { Header } from './components/layout/Header';
import { BottomNav, NavTab } from './components/layout/BottomNav';
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
  const profile = useLiveQuery(() => db.profile.filter(p => p.deleted_at === null).first());
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

  // If app is not initialized, show Onboarding Wizard
  if (profile === undefined) {
    // Loading state while Dexie initializes
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (profile === null) {
    return <OnboardingWizard onComplete={() => navigate('/home')} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-black font-sans antialiased text-gray-900 dark:text-gray-100 flex justify-center">
      <div className="w-full max-w-md min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col relative pb-20 shadow-xl border-x border-gray-200/50 dark:border-gray-800/50">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          isDark={isDark}
          onToggleTheme={() => setIsDark(!isDark)}
        />

        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<HomeScreen onNavigateToAttendance={() => handleTabChange('attendance')} />} />
            <Route path="/home" element={<HomeScreen onNavigateToAttendance={() => handleTabChange('attendance')} />} />
            <Route path="/attendance" element={<AttendanceScreen />} />
            <Route path="/timetable" element={<TimetableScreen />} />
            <Route path="/grades" element={<GradesScreen />} />
            <Route path="/more" element={<MoreScreen isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} onResetApp={() => navigate('/')} />} />
          </Routes>
        </main>

        <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
      </div>
    </div>
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
