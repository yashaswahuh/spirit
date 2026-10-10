import React, { useState, useRef } from 'react';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Share2,
  RefreshCw,
  Settings,
} from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  exportBackupJson,
  exportAttendanceCsv,
  exportMarksCsv,
  downloadOrShareFile,
  parseAndValidateBackup,
  restoreBackup,
  BackupCounts,
  BackupPayload,
} from '../../utils/backup';
import { getLastBackupTimestamp } from '../../utils/storage';
import { useDateFormat, formatDateTime } from '../../utils/preferences';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const dateFormat = useDateFormat();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedPayload, setParsedPayload] = useState<BackupPayload | null>(null);
  const [previewCounts, setPreviewCounts] = useState<BackupCounts | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [restoreSettings, setRestoreSettings] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState<string | null>(null);

  const lastBackupAt = getLastBackupTimestamp();

  // Handle JSON Export
  const handleExportJson = async (preferShare = true) => {
    try {
      setIsExporting(true);
      setExportSuccessMsg(null);
      const { jsonString, filename } = await exportBackupJson();
      const result = await downloadOrShareFile({
        filename,
        content: jsonString,
        mimeType: 'application/json',
        title: 'Spirit Academic Backup',
        preferShare,
      });

      if (result === 'shared') {
        setExportSuccessMsg('Backup shared successfully!');
      } else if (result === 'downloaded') {
        setExportSuccessMsg(`Backup saved as ${filename}`);
      }
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Attendance CSV Export
  const handleExportAttendanceCsv = async () => {
    try {
      setIsExporting(true);
      setExportSuccessMsg(null);
      const { csvString, filename } = await exportAttendanceCsv();
      const result = await downloadOrShareFile({
        filename,
        content: csvString,
        mimeType: 'text/csv',
        title: 'Spirit Attendance History',
      });
      if (result !== 'cancelled') {
        setExportSuccessMsg(`Attendance exported as ${filename}`);
      }
    } catch (err: any) {
      alert(`Attendance export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Marks CSV Export
  const handleExportMarksCsv = async () => {
    try {
      setIsExporting(true);
      setExportSuccessMsg(null);
      const { csvString, filename } = await exportMarksCsv();
      const result = await downloadOrShareFile({
        filename,
        content: csvString,
        mimeType: 'text/csv',
        title: 'Spirit Marks & Grades',
      });
      if (result !== 'cancelled') {
        setExportSuccessMsg(`Marks exported as ${filename}`);
      }
    } catch (err: any) {
      alert(`Marks export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle File Selection for Import
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setImportError(null);
    setErrorDetails([]);
    setParsedPayload(null);
    setPreviewCounts(null);
    setRestoreSuccessMsg(null);
    setIsParsing(true);

    try {
      const text = await file.text();
      const res = parseAndValidateBackup(text);
      if (res.success) {
        setParsedPayload(res.payload);
        setPreviewCounts(res.counts);
      } else {
        setImportError(res.error);
        if (res.details) setErrorDetails(res.details);
      }
    } catch (err: any) {
      setImportError(`Failed to read file: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!parsedPayload) return;
    try {
      setIsRestoring(true);
      const { importedCount, restoredSettings } = await restoreBackup(
        parsedPayload,
        importMode,
        { restoreSettings }
      );
      setShowConfirmModal(false);
      setRestoreSuccessMsg(
        `Successfully restored ${importedCount} records using ${
          importMode === 'replace' ? 'Replace' : 'Merge'
        } mode${restoredSettings ? ' (and updated app settings)' : ''}!`
      );
      setParsedPayload(null);
      setPreviewCounts(null);
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      alert(`Restore failed: ${err.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <>
      <ResponsiveDialog
        isOpen={isOpen}
        onClose={onClose}
        title="Backup & Restore"
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'export'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Download className="w-4 h-4" />
              Export & Share
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-3 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                activeTab === 'import'
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              Restore & Import
            </button>
          </div>

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {lastBackupAt ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl flex items-center justify-between">
                  <span>Last backed up:</span>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {formatDateTime(lastBackupAt, dateFormat)}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>No backup created yet. Back up now to protect your attendance!</span>
                </div>
              )}

              {exportSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{exportSuccessMsg}</span>
                </div>
              )}

              {/* Full JSON Backup */}
              <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      Full Application Backup (.json)
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Exports all your profile data, subjects, timetable, attendance logs, marks, and tasks in a versioned format.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => handleExportJson(true)}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors min-h-[44px] shadow-sm disabled:opacity-50"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    Share / Save to Cloud
                  </button>
                  <button
                    onClick={() => handleExportJson(false)}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-800 dark:text-gray-200 font-semibold text-xs transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Direct Download
                  </button>
                </div>
              </div>

              {/* CSV Exports */}
              <div className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Spreadsheet Exports (.csv)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Export attendance and marks for opening in Excel, Google Sheets, or printing.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleExportAttendanceCsv}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    Export Attendance CSV
                  </button>
                  <button
                    onClick={handleExportMarksCsv}
                    disabled={isExporting}
                    className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold text-xs transition-colors min-h-[44px] disabled:opacity-50"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                    Export Marks CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* IMPORT TAB */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {restoreSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span>{restoreSuccessMsg}</span>
                </div>
              )}

              {/* Upload Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-6 text-center cursor-pointer transition-colors space-y-2 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                    {importFile ? importFile.name : 'Choose Spirit Backup (.json)'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Tap to browse or drop your exported JSON backup file here
                  </p>
                </div>
              </div>

              {isParsing && (
                <div className="text-center py-4 text-xs text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                  Validating backup schema...
                </div>
              )}

              {/* Error Display */}
              {importError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl space-y-2 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-bold text-red-700 dark:text-red-400">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importError}</span>
                  </div>
                  {errorDetails.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 text-xs text-red-600 dark:text-red-300/90 pl-1 font-mono">
                      {errorDetails.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Valid Preview */}
              {previewCounts && (
                <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Backup Validated Successfully
                    </span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                      {previewCounts.totalRecords} total items
                    </span>
                  </div>

                  {/* Summary Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Courses</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        {previewCounts.courses}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Attendance</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        {previewCounts.attendanceRecords}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Timetable</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        {previewCounts.timetableSlots}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Marks & Tasks</span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        {previewCounts.marks + previewCounts.tasks}
                      </span>
                    </div>
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                      Choose Restore Strategy:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors text-xs ${
                          importMode === 'merge'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'merge'}
                          onChange={() => setImportMode('merge')}
                          className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="font-bold block text-gray-900 dark:text-white">
                            Merge (Recommended)
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight block mt-0.5">
                            Keep newer edits (latest timestamp wins). Missing items will be added without erasing unsaved local changes.
                          </span>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors text-xs ${
                          importMode === 'replace'
                            ? 'border-amber-600 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <input
                          type="radio"
                          name="importMode"
                          checked={importMode === 'replace'}
                          onChange={() => setImportMode('replace')}
                          className="mt-0.5 text-amber-600 focus:ring-amber-500"
                        />
                        <div>
                          <span className="font-bold block text-gray-900 dark:text-white">
                            Replace All Data
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight block mt-0.5">
                            Completely wipe current device storage and mirror the backup file exactly.
                          </span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Settings Restoration Option */}
                  <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700/80">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={restoreSettings}
                        onChange={e => setRestoreSettings(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                          <Settings className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Restore Previous Settings & Preferences
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5 leading-tight">
                          Applies theme, accent color, period timings, date/time format, and lab attendance rules from the backup.
                        </span>
                      </div>
                    </label>
                  </div>

                  {/* Trigger Confirmation */}
                  <button
                    onClick={() => setShowConfirmModal(true)}
                    className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm transition-colors min-h-[44px] shadow-sm flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Restore {previewCounts.totalRecords} Records ({importMode === 'merge' ? 'Merge' : 'Replace'})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </ResponsiveDialog>

      {/* Explicit Confirmation Dialog Before Write */}
      {showConfirmModal && previewCounts && (
        <ResponsiveDialog
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          title="Confirm Data Restore"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs sm:text-sm text-amber-900 dark:text-amber-200">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">
                  {importMode === 'replace'
                    ? 'Warning: This will overwrite ALL local records!'
                    : 'Notice: Data merge in progress'}
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                  {importMode === 'replace'
                    ? 'Your current IndexedDB storage will be cleared and replaced with the records in this backup file.'
                    : 'Records will be merged. For matching items, whichever was modified most recently will be kept.'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Selected file:</span>
                <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                  {importFile?.name}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Strategy:</span>
                <span className="font-bold capitalize text-indigo-600 dark:text-indigo-400">
                  {importMode}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Records to process:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {previewCounts.totalRecords}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300">
                <span>Restore settings:</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {restoreSettings ? 'Yes (theme, timings, formats)' : 'No (data only)'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs sm:text-sm min-h-[44px] shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isRestoring ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  'Yes, Restore Now'
                )}
              </button>
            </div>
          </div>
        </ResponsiveDialog>
      )}
    </>
  );
};
