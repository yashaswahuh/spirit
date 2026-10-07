import React, { useState } from 'react';
import {
  Smartphone,
  Laptop,
  ArrowRight,
  Download,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { exportBackupJson, downloadOrShareFile } from '../../utils/backup';

interface DeviceTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeviceTransferModal: React.FC<DeviceTransferModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const handleQuickExport = async () => {
    try {
      setIsExporting(true);
      setExportSuccess(null);
      const { jsonString, filename } = await exportBackupJson();
      const res = await downloadOrShareFile({
        filename,
        content: jsonString,
        mimeType: 'application/json',
        title: 'Spirit Device Transfer Backup',
      });
      if (res !== 'cancelled') {
        setExportSuccess(`Backup exported: ${filename}. Send this to your target device.`);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Transfer to Another Device"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Header Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
            <div className="p-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-indigo-600 dark:text-indigo-400">
              <Laptop className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-full shadow-xs">
            Local-First Transfer
          </span>
        </div>

        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
          Because Spirit never stores your data on external servers or requires sign-in, moving your attendance, timetable, and marks between your phone, laptop, or new device is completely private and done directly via backup files.
        </p>

        {exportSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{exportSuccess}</span>
          </div>
        )}

        {/* 4 Steps */}
        <div className="space-y-3">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              1
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                Export backup file on Device A
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Generate the encrypted JSON backup containing your entire semester and courses.
              </p>
              <button
                onClick={handleQuickExport}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-xs disabled:opacity-50 min-h-[38px]"
              >
                <Download className="w-3.5 h-3.5" />
                {isExporting ? 'Generating...' : 'Export Backup File (.json)'}
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              2
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                Send the file to Device B
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Send the downloaded <code className="text-indigo-600 dark:text-indigo-400 font-mono">.json</code> file to your other device via <strong>WhatsApp (message yourself)</strong>, <strong>Google Drive</strong>, <strong>AirDrop</strong>, <strong>Bluetooth</strong>, or <strong>Email</strong>.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              3
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                Open Spirit on Device B and Navigate to Import
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Open Spirit on your second device $\rightarrow$ Go to <strong>More</strong> tab $\rightarrow$ <strong>Backup & Restore</strong> $\rightarrow$ Select the <strong>Restore & Import</strong> tab $\rightarrow$ Upload the <code className="text-indigo-600 dark:text-indigo-400 font-mono">.json</code> file.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-xs flex items-start gap-3.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
              4
            </div>
            <div className="space-y-1 flex-1">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                Choose "Replace All Data"
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Choose <strong>Replace</strong> to mirror your phone/device exactly. Spirit will populate your active semester, past attendance records, and timetable slots instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Local Security Footnote */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Zero cloud intermediaries: data is transferred solely between your personal devices.</span>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
