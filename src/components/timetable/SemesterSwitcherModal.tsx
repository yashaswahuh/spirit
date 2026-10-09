import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Calendar,
  CheckCircle2,
  Plus,
  Edit2,
  Check,
  Sparkles,
  Save,
  X,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { Term, SaturdayRule, Weekday } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { setActiveTerm, updateTerm, createTerm } from '../../db/repositories/term.repo';
import { useDateFormat, formatDate } from '../../utils/preferences';

interface SemesterSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SATURDAY_RULE_OPTIONS: { value: SaturdayRule; label: string; desc: string }[] = [
  {
    value: 'second_saturday_off',
    label: '2nd Saturday Off',
    desc: 'Standard university holiday on the 2nd Saturday of each month',
  },
  {
    value: 'second_fourth_saturday_off',
    label: '2nd & 4th Saturday Off',
    desc: 'Holidays on 2nd and 4th Saturdays of every month',
  },
  {
    value: 'all_saturdays_off',
    label: 'All Saturdays Off (5-Day Week)',
    desc: 'Classes held Monday to Friday only',
  },
  {
    value: 'all_working',
    label: 'All Saturdays Working',
    desc: 'Full 6-day academic week (Mon-Sat)',
  },
];

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
];

export const SemesterSwitcherModal: React.FC<SemesterSwitcherModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dateFormat = useDateFormat();
  const terms = useLiveQuery(() => db.term.filter(t => t.deleted_at === null).sortBy('number')) || [];
  const program = useLiveQuery(() => db.program.filter(p => p.deleted_at === null).first());

  const [editingTermId, setEditingTermId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Edit / Add Form State
  const [formName, setFormName] = useState('');
  const [formNumber, setFormNumber] = useState(1);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formThreshold, setFormThreshold] = useState(75);
  const [formSaturdayRule, setFormSaturdayRule] = useState<SaturdayRule>('second_saturday_off');
  const [formWorkingDays, setFormWorkingDays] = useState<Weekday[]>([1, 2, 3, 4, 5, 6]);
  const [formMakeActive, setFormMakeActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const startEdit = (term: Term) => {
    setEditingTermId(term.id);
    setIsAddingNew(false);
    setFormName(term.name);
    setFormNumber(term.number);
    setFormStartDate(term.start_date);
    setFormEndDate(term.end_date);
    setFormThreshold(term.attendance_threshold || 75);
    setFormSaturdayRule(term.saturday_rule || 'second_saturday_off');
    setFormWorkingDays(term.working_days || [1, 2, 3, 4, 5, 6]);
  };

  const startAddNew = () => {
    setIsAddingNew(true);
    setEditingTermId(null);
    const nextNum = terms.length > 0 ? Math.max(...terms.map(t => t.number)) + 1 : 1;
    setFormNumber(nextNum);
    setFormName(`Semester ${nextNum}`);

    // Default dates: today to +4 months
    const now = new Date();
    const fourMonths = new Date();
    fourMonths.setMonth(fourMonths.getMonth() + 4);
    setFormStartDate(now.toISOString().slice(0, 10));
    setFormEndDate(fourMonths.toISOString().slice(0, 10));
    setFormThreshold(75);
    setFormSaturdayRule('second_saturday_off');
    setFormWorkingDays([1, 2, 3, 4, 5, 6]);
    setFormMakeActive(true);
  };

  const cancelForm = () => {
    setEditingTermId(null);
    setIsAddingNew(false);
  };

  const toggleWorkingDay = (day: Weekday) => {
    if (formWorkingDays.includes(day)) {
      if (formWorkingDays.length <= 1) return; // keep at least 1
      setFormWorkingDays(formWorkingDays.filter(d => d !== day));
    } else {
      setFormWorkingDays([...formWorkingDays, day].sort());
    }
  };

  const handleSaveTerm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formStartDate || !formEndDate) return;

    setIsSubmitting(true);
    try {
      if (editingTermId) {
        await updateTerm(editingTermId, {
          name: formName.trim(),
          number: formNumber,
          start_date: formStartDate,
          end_date: formEndDate,
          attendance_threshold: Number(formThreshold),
          saturday_rule: formSaturdayRule,
          working_days: formWorkingDays,
        });
      } else if (isAddingNew) {
        const newTerm = await createTerm({
          program_id: program?.id || 'default_program',
          number: formNumber,
          name: formName.trim(),
          start_date: formStartDate,
          end_date: formEndDate,
          sgpa: null,
          status: formMakeActive ? 'ongoing' : 'upcoming',
          attendance_threshold: Number(formThreshold),
          saturday_rule: formSaturdayRule,
          working_days: formWorkingDays,
        });

        if (formMakeActive) {
          await setActiveTerm(newTerm.id);
        }
      }
      cancelForm();
    } catch (err) {
      console.error('Failed to save semester:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchActive = async (termId: string) => {
    await setActiveTerm(termId);
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Semesters & Terms"
      description="Switch active semester, edit semester dates, attendance targets, and Saturday off rules."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-800">
          <div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {terms.length} {terms.length === 1 ? 'Semester' : 'Semesters'} Configured
            </span>
          </div>
          {!isAddingNew && !editingTermId && (
            <button
              type="button"
              onClick={startAddNew}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Semester
            </button>
          )}
        </div>

        {/* Edit or Add Form */}
        {(isAddingNew || editingTermId) && (
          <form
            onSubmit={handleSaveTerm}
            className="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/60 rounded-3xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {editingTermId ? 'Edit Semester Details' : 'Add New Semester'}
              </h4>
              <button
                type="button"
                onClick={cancelForm}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Semester Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Semester 3"
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Semester Number
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formNumber}
                  onChange={e => setFormNumber(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Target Threshold (%)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={formThreshold}
                  onChange={e => setFormThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Saturday Rule Selector */}
            <div>
              <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 mb-1">
                Saturday Working Rule
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SATURDAY_RULE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormSaturdayRule(opt.value)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      formSaturdayRule === opt.value
                        ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-600'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-bold">{opt.label}</span>
                      {formSaturdayRule === opt.value && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Working Days Checkboxes */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Working Days of Week
              </label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map(day => {
                  const isSelected = formWorkingDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleWorkingDay(day.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isAddingNew && (
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formMakeActive}
                  onChange={e => setFormMakeActive(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Set as currently ongoing active semester immediately</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={cancelForm}
                className="px-3.5 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {editingTermId ? 'Save Changes' : 'Create Semester'}
              </button>
            </div>
          </form>
        )}

        {/* Semesters List */}
        <div className="space-y-3">
          {terms.map(term => {
            const isOngoing = term.status === 'ongoing';
            const satRuleInfo = SATURDAY_RULE_OPTIONS.find(o => o.value === (term.saturday_rule || 'second_saturday_off'));

            return (
              <div
                key={term.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isOngoing
                    ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60 shadow-sm ring-1 ring-indigo-500/20'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                      {term.name}
                    </h4>
                    {isOngoing ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-600 text-white uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Active Ongoing
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 capitalize">
                        {term.status}
                      </span>
                    )}

                    {satRuleInfo && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                        {satRuleInfo.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {formatDate(term.start_date, dateFormat)} to {formatDate(term.end_date, dateFormat)}
                    </span>
                    <span>•</span>
                    <span>Target: {term.attendance_threshold || 75}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                  {!isOngoing && (
                    <button
                      type="button"
                      onClick={() => handleSwitchActive(term.id)}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-indigo-600 hover:text-white text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-all"
                    >
                      Make Active
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => startEdit(term)}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors rounded-lg border border-transparent hover:border-gray-200 dark:hover:border-gray-700"
                    title="Edit Semester"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};
