import React, { useState } from 'react';
import { History, Plus, CheckCircle2, Calendar } from 'lucide-react';
import { TimetableVersion } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: TimetableVersion[];
  currentVersionId?: string | null;
  onSelectVersion: (versionId: string) => void;
  onCreateVersion: (name: string, effectiveFrom: string) => Promise<void>;
}

export const VersionModal: React.FC<VersionModalProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersionId,
  onSelectVersion,
  onCreateVersion,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onCreateVersion(name.trim(), effectiveFrom);
      setName('');
      setShowCreateForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Timetable Versions"
      description="Manage semester schedule versions with effective dates"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Version list */}
        <div className="space-y-2">
          {versions.map(v => {
            const isSelected = v.id === currentVersionId;
            return (
              <div
                key={v.id}
                onClick={() => onSelectVersion(v.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      {v.name}
                      {isSelected && (
                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold">
                          Active View
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 font-mono">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      Effective from: {v.effective_from}
                    </p>
                  </div>
                </div>

                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* Create new version section */}
        {!showCreateForm ? (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="w-full py-3 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Create New Timetable Version
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3"
          >
            <div className="text-xs text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900/40">
              <span className="font-bold">Tip:</span> A new version starts as a copy of the current timetable. Past days and attendance records will NOT be rewritten.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Version Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Revised Post-Midsem Schedule"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                Apply From Date *
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={e => setEffectiveFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-lg min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm min-h-[44px]"
              >
                {isSubmitting ? 'Copying...' : 'Create & Copy Schedule'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
};

