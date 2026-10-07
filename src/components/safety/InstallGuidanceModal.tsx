import React, { useState, useEffect } from 'react';
import {
  Download,
  Share,
  PlusSquare,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
} from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

import { subscribePwaInstall, promptPwaInstall } from '../../utils/pwa';

interface InstallGuidanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onPromptInstall?: () => void;
}

export const InstallGuidanceModal: React.FC<InstallGuidanceModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt: propDeferredPrompt,
  onPromptInstall: propOnPromptInstall,
}) => {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [canInstallNative, setCanInstallNative] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      const isApple =
        /iPad|iPhone|iPod/.test(ua) ||
        (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
      setIsIOS(isApple);

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    }

    const unsubscribe = subscribePwaInstall((canInstall) => {
      setCanInstallNative(canInstall);
    });
    return unsubscribe;
  }, []);

  const handleInstallClick = async () => {
    if (propOnPromptInstall) {
      propOnPromptInstall();
      return;
    }
    const success = await promptPwaInstall();
    if (success) {
      onClose();
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Install Spirit & Protect Data"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Standalone status badge */}
        {isStandalone ? (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold block">Spirit is Running as an Installed App!</span>
              <span className="text-emerald-700 dark:text-emerald-300/90 text-xs">
                Your device treats Spirit as a standalone application with maximum storage isolation.
              </span>
            </div>
          </div>
        ) : (canInstallNative || propDeferredPrompt) ? (
          /* Browser supports native prompt */
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-bold text-indigo-900 dark:text-indigo-200 block">
                Direct Browser Installation Available
              </span>
              <span className="text-xs text-indigo-700 dark:text-indigo-300">
                Install Spirit to your desktop or home screen with 1 tap.
              </span>
            </div>
            <button
              onClick={handleInstallClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors shadow-sm min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Install Spirit Now
            </button>
          </div>
        ) : null}

        {/* Critical iOS Safari Storage Warning Callout */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Why Installing Protects Your Attendance Data</span>
          </div>
          <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed text-xs">
            On iOS (Safari), Apple's WebKit ITP policy <strong>automatically clears IndexedDB storage</strong> for regular browser tabs if you do not open the website for 7 days.
          </p>
          <p className="text-amber-900 dark:text-amber-200/90 leading-relaxed text-xs font-semibold">
            Adding Spirit to your Home Screen grants it persistent PWA privileges, preventing iOS from clearing your semester attendance and subjects!
          </p>
        </div>

        {/* Step-by-Step iOS Instructions */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Smartphone className="w-4 h-4 text-indigo-600" />
            How to Add to Home Screen (iOS Safari){isIOS && ' (Recommended for your device)'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs space-y-2">
              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                1
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <Share className="w-3.5 h-3.5 text-indigo-600" />
                  Tap Share Button
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  In Safari's bottom toolbar, tap the square Share icon with an upward arrow.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs space-y-2">
              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <PlusSquare className="w-3.5 h-3.5 text-indigo-600" />
                  Add to Home Screen
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  Scroll down the share sheet and select "Add to Home Screen".
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs space-y-2">
              <div className="w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <div className="space-y-1">
                <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Tap "Add"
                </span>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                  Tap "Add" in the top-right corner. Launch Spirit anytime from your home screen.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chrome / Android Guidance */}
        <div className="p-3.5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl text-xs space-y-1">
          <span className="font-bold text-gray-800 dark:text-gray-200">
            Using Chrome or Android?
          </span>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
            Tap the browser menu (three dots in top right) $\rightarrow$ select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.
          </p>
        </div>

        {/* Storage Safety Footnote */}
        <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Installed PWAs run 100% offline and maintain protected offline storage.</span>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
