import React from 'react';
import { BASE_PATH } from './config';

export const App: React.FC = () => {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-indigo-200 dark:shadow-none">
          S
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Spirit</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Attendance + Semester Dashboard
          </p>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-950/40 rounded-xl p-4 text-left border border-indigo-100 dark:border-indigo-900/50">
          <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
            Phase 1 Complete
          </p>
          <p className="text-sm text-indigo-700 dark:text-indigo-200 mt-1">
            Calculation engine and data model presets verified. Core UI will be delivered in upcoming phases.
          </p>
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 pt-2 border-t border-gray-100 dark:border-gray-800">
          Base Path: <code className="font-mono text-indigo-500">{BASE_PATH}</code>
        </div>
      </div>
    </main>
  );
};

export default App;
