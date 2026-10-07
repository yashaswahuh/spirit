import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  GradingScheme,
  GradingSchemeData,
  GradeScaleEntry,
  DivisionThreshold,
  CgpaToPercentageRule,
} from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import { updateGradingScheme } from '../../db/repositories/scheme.repo';

interface GradingSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  gradingScheme: GradingScheme | null;
  onSaved?: () => void;
}

export const GradingSchemeModal: React.FC<GradingSchemeModalProps> = ({
  isOpen,
  onClose,
  gradingScheme,
  onSaved,
}) => {
  const [name, setName] = useState('');
  const [scale, setScale] = useState<GradeScaleEntry[]>([]);
  const [passMark, setPassMark] = useState<number>(40);
  const [maxPoint, setMaxPoint] = useState<number>(10);
  const [repeatHandling, setRepeatHandling] = useState<'replace_old' | 'keep_best'>('replace_old');
  const [ruleType, setRuleType] = useState<'multiplier' | 'custom_formula'>('multiplier');
  const [multiplier, setMultiplier] = useState<number>(9.5);
  const [formulaExpression, setFormulaExpression] = useState<string>('(CGPA - 0.75) * 10');
  const [precision, setPrecision] = useState<number>(2);
  const [roundingMode, setRoundingMode] = useState<'round' | 'floor' | 'ceil'>('round');
  const [divisionThresholds, setDivisionThresholds] = useState<DivisionThreshold[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gradingScheme) {
      setName(gradingScheme.name);
      const data = gradingScheme.scheme_data;
      setScale(data.scale || []);
      setPassMark(data.pass_mark || 40);
      setMaxPoint(data.max_point || 10);
      setRepeatHandling(data.repeat_handling || 'replace_old');

      const cgpaRule = data.cgpa_to_percentage || { rule_type: 'multiplier', multiplier: 9.5 };
      setRuleType(cgpaRule.rule_type);
      setMultiplier(cgpaRule.multiplier ?? 9.5);
      setFormulaExpression(cgpaRule.formula_expression || '(CGPA - 0.75) * 10');

      setPrecision(data.rounding?.precision ?? 2);
      setRoundingMode(data.rounding?.mode ?? 'round');

      setDivisionThresholds(
        data.division_thresholds || [
          { name: 'First Class with Distinction', min_percentage: 75 },
          { name: 'First Class', min_percentage: 60 },
          { name: 'Second Class', min_percentage: 50 },
          { name: 'Pass Class', min_percentage: 40 },
        ]
      );
    }
  }, [gradingScheme, isOpen]);

  if (!gradingScheme) return null;

  const handleAddScaleRow = () => {
    setScale([
      ...scale,
      { letter: 'New', points: 0, min_percentage: 0, max_percentage: 39.99, description: 'Pass' },
    ]);
  };

  const handleRemoveScaleRow = (index: number) => {
    setScale(scale.filter((_, i) => i !== index));
  };

  const handleUpdateScaleRow = (index: number, field: keyof GradeScaleEntry, value: any) => {
    const updated = [...scale];
    updated[index] = { ...updated[index], [field]: value };
    setScale(updated);
  };

  const handleAddDivision = () => {
    setDivisionThresholds([
      ...divisionThresholds,
      { name: 'New Division', min_percentage: 40 },
    ]);
  };

  const handleRemoveDivision = (index: number) => {
    setDivisionThresholds(divisionThresholds.filter((_, i) => i !== index));
  };

  const handleUpdateDivision = (index: number, field: keyof DivisionThreshold, value: any) => {
    const updated = [...divisionThresholds];
    updated[index] = { ...updated[index], [field]: value };
    setDivisionThresholds(updated);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const cgpaRule: CgpaToPercentageRule = {
        rule_type: ruleType,
        multiplier: ruleType === 'multiplier' ? multiplier : undefined,
        formula_expression: ruleType === 'custom_formula' ? formulaExpression : undefined,
      };

      const updatedSchemeData: GradingSchemeData = {
        type: gradingScheme.scheme_data.type || 'indian_10_point',
        scale,
        pass_mark: passMark,
        max_point: maxPoint,
        cgpa_to_percentage: cgpaRule,
        rounding: { precision, mode: roundingMode },
        division_thresholds: divisionThresholds,
        repeat_handling: repeatHandling,
        notes: gradingScheme.scheme_data.notes,
      };

      await updateGradingScheme(gradingScheme.id, {
        name,
        scheme_data: updatedSchemeData,
      });

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update grading scheme:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Grading Scheme & Rules"
      description="Configure grade scales, repeat handling, and CGPA-to-percentage formula."
      maxWidth="lg"
    >
      <form onSubmit={handleSave} className="space-y-6">
        {/* Prominent University Disclaimer */}
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Check your university's official regulations!</span>
            <p className="text-[11px] leading-relaxed">
              Grading schemes, CGPA-to-percentage multipliers, repeat/backlog rules, and pass thresholds vary widely across universities (e.g. VTU, AKTU, Anna Univ, Mumbai Univ, CBSE). Check your syllabus book or exam ordinance.
            </p>
          </div>
        </div>

        {/* Scheme Name & Core Bounds */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Scheme Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Max Point (e.g. 10 or 4)
            </label>
            <input
              type="number"
              step="0.1"
              value={maxPoint}
              onChange={(e) => setMaxPoint(parseFloat(e.target.value) || 10)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Pass Marks (% or marks)
            </label>
            <input
              type="number"
              value={passMark}
              onChange={(e) => setPassMark(parseFloat(e.target.value) || 40)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Repeat / Backlog Handling */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            Backlog / Improvement Exam Handling
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer">
              <input
                type="radio"
                name="repeat_handling"
                value="replace_old"
                checked={repeatHandling === 'replace_old'}
                onChange={() => setRepeatHandling('replace_old')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  Replace Old Grade (Latest Attempt)
                </span>
                <span className="text-[11px] text-gray-500">
                  Most Indian universities replace the backlog attempt F grade with the new cleared grade.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer">
              <input
                type="radio"
                name="repeat_handling"
                value="keep_best"
                checked={repeatHandling === 'keep_best'}
                onChange={() => setRepeatHandling('keep_best')}
                className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-gray-900 dark:text-white block">
                  Keep Best Attempt
                </span>
                <span className="text-[11px] text-gray-500">
                  Keeps whichever attempt earned the highest grade points (common in improvement exams).
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* CGPA-to-Percentage Conversion Rule */}
        <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3">
          <label className="block text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
            CGPA to Percentage Conversion Rule
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rule_type"
                value="multiplier"
                checked={ruleType === 'multiplier'}
                onChange={() => setRuleType('multiplier')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Simple Multiplier (e.g. CGPA × 9.5 or CGPA × 10)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="rule_type"
                value="custom_formula"
                checked={ruleType === 'custom_formula'}
                onChange={() => setRuleType('custom_formula')}
                className="text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Custom Formula (e.g. (CGPA - 0.75) × 10)
              </span>
            </label>
          </div>

          {ruleType === 'multiplier' ? (
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-gray-500">Percentage = CGPA ×</span>
              <input
                type="number"
                step="0.05"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value) || 9.5)}
                className="w-24 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              />
              <span className="text-[11px] text-gray-400">AICTE standard is 9.5 (or 10 for direct conversion)</span>
            </div>
          ) : (
            <div>
              <input
                type="text"
                value={formulaExpression}
                onChange={(e) => setFormulaExpression(e.target.value)}
                placeholder="e.g. (CGPA - 0.75) * 10"
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
              />
              <p className="text-[11px] text-gray-400 mt-1">Supports expressions like "(CGPA - 0.75) * 10" used by VTU.</p>
            </div>
          )}
        </div>

        {/* Letter-to-Points Scale Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
              Grade Scale (Letter to Grade Points)
            </h4>
            <button
              type="button"
              onClick={handleAddScaleRow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Grade Row
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-2xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Grade</th>
                  <th className="py-2.5 px-3">Points</th>
                  <th className="py-2.5 px-3">Min %</th>
                  <th className="py-2.5 px-3">Max %</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-2 text-center w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 bg-white dark:bg-gray-900">
                {scale.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.letter}
                        onChange={(e) => handleUpdateScaleRow(idx, 'letter', e.target.value.toUpperCase())}
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-bold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="0.5"
                        value={row.points}
                        onChange={(e) => handleUpdateScaleRow(idx, 'points', parseFloat(e.target.value) || 0)}
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        value={row.min_percentage ?? ''}
                        onChange={(e) => handleUpdateScaleRow(idx, 'min_percentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="number"
                        step="1"
                        value={row.max_percentage ?? ''}
                        onChange={(e) => handleUpdateScaleRow(idx, 'max_percentage', e.target.value ? parseFloat(e.target.value) : undefined)}
                        placeholder="100"
                        className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white font-mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={row.description || ''}
                        onChange={(e) => handleUpdateScaleRow(idx, 'description', e.target.value)}
                        placeholder="e.g. Outstanding"
                        className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-gray-900 dark:text-white"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveScaleRow(idx)}
                        className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Division Thresholds (for Percentage / Annual systems) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                Division / Class Thresholds
              </h4>
              <p className="text-[11px] text-gray-500">For annual systems and final degree classification.</p>
            </div>
            <button
              type="button"
              onClick={handleAddDivision}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-200 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Division
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {divisionThresholds.map((div, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <input
                  type="text"
                  value={div.name}
                  onChange={(e) => handleUpdateDivision(idx, 'name', e.target.value)}
                  placeholder="Class name"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-semibold text-gray-900 dark:text-white"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={div.min_percentage}
                    onChange={(e) => handleUpdateDivision(idx, 'min_percentage', parseFloat(e.target.value) || 0)}
                    placeholder="Min %"
                    className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-mono text-gray-900 dark:text-white"
                  />
                  <span className="text-xs font-mono text-gray-500">%</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDivision(idx)}
                  className="text-gray-400 hover:text-rose-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? 'Saving...' : 'Save Scheme Rules'}
          </button>
        </div>
      </form>
    </ResponsiveDialog>
  );
};
