import React from 'react';
import {
  ShieldCheck,
  ServerOff,
  EyeOff,
  AlertTriangle,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenBackup?: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  onOpenBackup,
}) => {
  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Privacy & Storage Policy"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Main Trust Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>100% On-Device & Zero-Tracking Architecture</span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
            Spirit is built as a truly local-first tool for college students. We believe your attendance logs, marks, and timetable belong strictly to you.
          </p>
        </div>

        {/* 4 Core Privacy Guarantees */}
        <div className="space-y-2.5 text-xs sm:text-sm">
          <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shrink-0">
              <ServerOff className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                Zero Cloud Servers & No Login Accounts
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                There are no backend databases, user passwords, or external servers. Spirit works without an internet connection.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shrink-0">
              <EyeOff className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                No Trackers, Cookies, or Analytics
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                Spirit contains zero third-party telemetry, tracking pixels, advertising SDKs, or analytics beacons.
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3">
            <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shrink-0">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">
                IndexedDB Browser Storage
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                All records live exclusively inside your browser's private IndexedDB database on your physical device.
              </p>
            </div>
          </div>
        </div>

        {/* Vital Notice on Clearing Browser Data */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Important Data Retention Warning</span>
          </div>
          <p className="text-amber-900 dark:text-amber-200 leading-relaxed">
            Because data lives exclusively in this browser, <strong>clearing your browser history or website data will erase all stored semester records</strong> unless you have saved a backup.
          </p>
          <p className="text-amber-900 dark:text-amber-200 font-semibold">
            We strongly recommend exporting a JSON backup periodically and saving it to Google Drive or your computer.
          </p>
          {onOpenBackup && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenBackup();
                }}
                className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                <FileCheck className="w-3.5 h-3.5" />
                Open Backup Screen Now
              </button>
            </div>
          )}
        </div>
      </div>
    </ResponsiveDialog>
  );
};
