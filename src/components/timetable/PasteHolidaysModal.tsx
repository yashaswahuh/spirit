import React, { useState } from 'react';
import { Clipboard, Check } from 'lucide-react';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { parsePastedHolidays, ParsedHoliday } from '../../engine/timetable';

interface PasteHolidaysModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveHolidays: (holidays: ParsedHoliday[]) => Promise<void>;
}

const SAMPLE_TEXT = `2026-08-15: Independence Day
2026-10-02: Gandhi Jayanti
2026-10-19 to 2026-10-23: Diwali Vacation
2026-12-25: Christmas`;

export const PasteHolidaysModal: React.FC<PasteHolidaysModalProps> = ({
  isOpen,
  onClose,
  onSaveHolidays,
}) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsed = parsePastedHolidays(inputText);

  const handleUseSample = () => {
    setInputText(SAMPLE_TEXT);
  };

  const handleSave = async () => {
    if (parsed.length === 0) return;
    setIsSubmitting(true);
    try {
      await onSaveHolidays(parsed);
      setInputText('');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Paste Holiday List"
      description="Quickly import semester holidays by pasting dates and names from your academic calendar"
      maxWidth="lg"
    >
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5 text-indigo-500" />
              Paste Text Here
            </label>
            <button
              type="button"
              onClick={handleUseSample}
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Load Sample Format
            </button>
          </div>
          <textarea
            rows={5}
            placeholder={`e.g.\n2026-10-02 Gandhi Jayanti\n2026-10-19 to 2026-10-23: Diwali Break\n25/12/2026 Christmas`}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-xs focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Supported formats: <code className="font-mono">YYYY-MM-DD Holiday</code>, <code className="font-mono">YYYY-MM-DD to YYYY-MM-DD Vacation</code>, or <code className="font-mono">DD/MM/YYYY Holiday</code>.
          </p>
        </div>

        {/* Live Preview */}
        <div>
          <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
            Parsed Holidays Preview ({parsed.length} detected)
          </h4>
          {parsed.length === 0 ? (
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800 text-center text-xs text-gray-400">
              Paste holiday text above to see parsed dates
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700">
              {parsed.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs"
                >
                  <div className="font-semibold text-gray-900 dark:text-white truncate">
                    {item.name}
                  </div>
                  <div className="font-mono text-indigo-600 dark:text-indigo-400 font-bold whitespace-nowrap ml-2">
                    {item.date} {item.endDate ? `to ${item.endDate}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 rounded-xl min-h-[44px]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={parsed.length === 0 || isSubmitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-all min-h-[44px]"
          >
            <Check className="w-3.5 h-3.5" />
            {isSubmitting ? 'Importing...' : `Import ${parsed.length} Holidays`}
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};

