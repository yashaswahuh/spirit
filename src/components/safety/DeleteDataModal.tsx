import React, { useState } from 'react';
import { AlertOctagon, Trash2, RefreshCw } from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { resetDatabase } from '../../db/repositories/setup.repo';
import { clearStorageSafetyData } from '../../utils/storage';

interface DeleteDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

const REQUIRED_CONFIRMATION_TEXT = 'DELETE';

export const DeleteDataModal: React.FC<DeleteDataModalProps> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const [typedInput, setTypedInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmed = typedInput.trim().toUpperCase() === REQUIRED_CONFIRMATION_TEXT;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    try {
      setIsDeleting(true);
      await resetDatabase();
      clearStorageSafetyData();
      onClose();
      onDeleted();
    } catch (err: any) {
      alert(`Failed to delete data: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete All My Data"
      maxWidth="md"
    >
      <form onSubmit={handleDelete} className="space-y-4">
        {/* Warning Callout */}
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl space-y-2">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-bold text-xs sm:text-sm">
            <AlertOctagon className="w-5 h-5 shrink-0" />
            <span>Permanent & Irreversible Action</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-300/90 leading-relaxed">
            This will permanently erase all local student profile data, courses, timetable schedules, attendance logs, marks, and tasks stored in this browser.
          </p>
          <p className="text-xs text-red-700 dark:text-red-300/90 font-semibold">
            Unless you have exported a JSON backup, your data cannot be recovered.
          </p>
        </div>

        {/* Typed Confirmation Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
            To confirm deletion, please type <span className="font-mono text-red-600 dark:text-red-400 font-black">DELETE</span> below:
          </label>
          <input
            type="text"
            value={typedInput}
            onChange={(e) => setTypedInput(e.target.value)}
            placeholder="Type DELETE to confirm"
            autoFocus
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold text-xs sm:text-sm min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isConfirmed || isDeleting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm min-h-[44px] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Erasing Data...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Permanently Delete All Data
              </>
            )}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
