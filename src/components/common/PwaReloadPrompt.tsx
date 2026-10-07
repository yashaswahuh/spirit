import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DownloadCloud, X } from 'lucide-react';

export const PwaReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        console.log('Spirit ServiceWorker successfully registered.');
      }
    },
    onRegisterError(error) {
      console.warn('Spirit ServiceWorker registration warning:', error);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 sm:right-6 z-50 max-w-sm p-4 rounded-2xl bg-indigo-900 text-white shadow-2xl border border-indigo-700 animate-fade-in flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <DownloadCloud className="w-5 h-5 text-indigo-300 shrink-0" />
        <div>
          <p className="text-xs font-bold leading-tight">New Version Available</p>
          <p className="text-[11px] text-indigo-200 leading-tight">
            Tap update to reload Spirit with the newest offline assets.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => updateServiceWorker(true)}
          className="px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold transition-colors shadow-xs min-h-[32px]"
        >
          Update
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="p-1 text-indigo-300 hover:text-white rounded-lg transition-colors"
          aria-label="Dismiss update notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
