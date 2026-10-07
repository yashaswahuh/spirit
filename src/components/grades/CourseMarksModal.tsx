import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Plus,
  Trash2,
  Sparkles,
  Calculator,
  Clock,
  UserX,
} from 'lucide-react';
import { db } from '../../db/dexie';
import { Course, AssessmentComponent, Mark, AssessmentRuleType } from '../../types';
import { ResponsiveDialog } from '../layout/ResponsiveDialog';
import {
  createAssessmentComponent,
  updateAssessmentComponent,
  deleteAssessmentComponent,
  applyAssessmentTemplate,
  saveMark,
  ASSESSMENT_TEMPLATES,
} from '../../db/repositories/assessment.repo';
import {
  calculateCourseInternalMarks,
  EvaluatedComponent,
} from '../../engine/marks';

interface CourseMarksModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  onSaved?: () => void;
}

export const CourseMarksModal: React.FC<CourseMarksModalProps> = ({
  isOpen,
  onClose,
  course,
}) => {
  // Queries
  const components = useLiveQuery(
    () =>
      db.assessment_component
        .where('course_id')
        .equals(course.id)
        .filter(c => c.deleted_at === null)
        .toArray(),
    [course.id]
  ) || [];

  const marks = useLiveQuery(() =>
    db.mark.filter(m => m.deleted_at === null).toArray()
  ) || [];

  const markMap = new Map<string, Mark>(marks.map(m => [m.component_id, m]));

  // Add / Edit component form state
  const [isAddingComponent, setIsAddingComponent] = useState(false);
  const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [maxMarks, setMaxMarks] = useState<number>(50);
  const [weightage, setWeightage] = useState<number>(20);
  const [rule, setRule] = useState<AssessmentRuleType>('normal');
  const [ruleGroup, setRuleGroup] = useState<string>('');
  const [ruleParamN, setRuleParamN] = useState<number>(1);
  const [isEndSem, setIsEndSem] = useState<boolean>(false);
  const [minPassMarks, setMinPassMarks] = useState<string>('');

  // Live evaluation
  const evaluatedItems: EvaluatedComponent[] = components.map(c => {
    const mark = markMap.get(c.id);
    return {
      id: c.id,
      name: c.name,
      max_marks: c.max_marks,
      obtained_marks: mark?.obtained_marks ?? 0,
      weightage: c.weightage,
      rule: c.rule,
      rule_group: c.rule_group,
      rule_params: c.rule_params,
      status: mark?.status || (mark?.obtained_marks !== null && mark?.obtained_marks !== undefined ? 'entered' : 'not_held'),
      is_end_sem: c.is_end_sem,
      min_pass_marks: c.min_pass_marks,
    };
  });

  const summary = calculateCourseInternalMarks(evaluatedItems);

  const resetForm = () => {
    setName('');
    setMaxMarks(50);
    setWeightage(20);
    setRule('normal');
    setRuleGroup('');
    setRuleParamN(1);
    setIsEndSem(false);
    setMinPassMarks('');
    setIsAddingComponent(false);
    setEditingComponentId(null);
  };

  const handleStartEdit = (c: AssessmentComponent) => {
    setEditingComponentId(c.id);
    setName(c.name);
    setMaxMarks(c.max_marks);
    setWeightage(c.weightage);
    setRule(c.rule);
    setRuleGroup(c.rule_group || '');
    setRuleParamN(c.rule_params?.n || c.rule_params?.count || 1);
    setIsEndSem(c.is_end_sem);
    setMinPassMarks(c.min_pass_marks !== null && c.min_pass_marks !== undefined ? c.min_pass_marks.toString() : '');
    setIsAddingComponent(true);
  };

  const handleSaveComponent = async (e: React.FormEvent) => {
    e.preventDefault();
    const ruleParams =
      rule === 'best_of_N'
        ? { n: ruleParamN }
        : rule === 'drop_lowest'
        ? { count: ruleParamN }
        : null;

    if (editingComponentId) {
      await updateAssessmentComponent(editingComponentId, {
        name,
        max_marks: maxMarks,
        weightage,
        rule,
        rule_group: ruleGroup.trim() || null,
        rule_params: ruleParams,
        is_end_sem: isEndSem,
        min_pass_marks: minPassMarks ? parseFloat(minPassMarks) : null,
      });
    } else {
      await createAssessmentComponent({
        course_id: course.id,
        name,
        max_marks: maxMarks,
        weightage,
        rule,
        rule_group: ruleGroup.trim() || null,
        rule_params: ruleParams,
        is_end_sem: isEndSem,
        min_pass_marks: minPassMarks ? parseFloat(minPassMarks) : null,
      });
    }
    resetForm();
  };

  const handleApplyTemplate = async (templateKey: string) => {
    if (components.length > 0) {
      if (!confirm('Applying this template will replace existing assessment components for this subject. Continue?')) {
        return;
      }
    }
    await applyAssessmentTemplate(course.id, templateKey);
  };

  const handleMarkChange = async (componentId: string, val: string) => {
    if (val === '') {
      await saveMark(componentId, null, 'not_held');
    } else {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        await saveMark(componentId, num, 'entered');
      }
    }
  };

  const handleSetAbsent = async (componentId: string) => {
    await saveMark(componentId, 0, 'absent');
  };

  const handleSetNotHeld = async (componentId: string) => {
    await saveMark(componentId, null, 'not_held');
  };

  const totalConfiguredWeightage = components.reduce((acc, c) => acc + c.weightage, 0);

  if (!course) return null;

  return (
    <ResponsiveDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`${course.name} - Assessment Components`}
      description={`Log marks, configure components, and track internal standing for ${course.code || 'this subject'}`}
      maxWidth="xl"
    >
      <div className="space-y-6">
        {/* Quick Summary Pill Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Evaluated Marks</span>
            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              {summary.total_weighted_marks_obtained.toFixed(1)} / {summary.total_weightage_evaluated}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Current Standing</span>
            <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400">
              {summary.total_weightage_evaluated > 0 ? `${summary.scaled_percentage.toFixed(1)}%` : 'N/A'}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Total Configured</span>
            <p className={`text-base sm:text-lg font-black ${totalConfiguredWeightage === 100 ? 'text-emerald-600' : 'text-amber-500'}`}>
              {totalConfiguredWeightage}% weight
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Components</span>
            <p className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
              {components.length} items
            </p>
          </div>
        </div>

        {/* Quick Templates Strip */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Templates
            </span>
            <span className="text-[11px] text-gray-400">Click to apply & edit</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ASSESSMENT_TEMPLATES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => handleApplyTemplate(t.key)}
                className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-500 text-left transition-all group"
              >
                <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                  {t.name}
                </div>
                <div className="text-[10px] text-gray-400 truncate mt-0.5">
                  {t.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Assessment Components List with Marks Entry */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              Components & Marks Entry
            </h4>

            {!isAddingComponent && (
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsAddingComponent(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Component
              </button>
            )}
          </div>

          {components.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-2">
              <Calculator className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                No assessment components created yet. Pick a template above or click Add Component.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {components.map(comp => {
                const mark = markMap.get(comp.id);
                const markStatus = mark?.status || (mark?.obtained_marks !== null && mark?.obtained_marks !== undefined ? 'entered' : 'not_held');
                const contrib = summary.components.find(c => c.id === comp.id);

                return (
                  <div
                    key={comp.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">
                          {comp.name}
                        </span>

                        {comp.is_end_sem && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            End-Sem Exam
                          </span>
                        )}

                        {comp.rule !== 'normal' && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {comp.rule === 'best_of_N' ? `Best of ${comp.rule_params?.n || 1}` : 'Drop Lowest'}
                          </span>
                        )}

                        {contrib?.is_dropped_or_excluded && markStatus !== 'not_held' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-600">
                            Dropped by Rule
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium">
                        <span>Max: {comp.max_marks}</span>
                        <span>•</span>
                        <span>Weight: {comp.weightage}%</span>
                        {comp.min_pass_marks && (
                          <>
                            <span>•</span>
                            <span>Min Cutoff: {comp.min_pass_marks}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Marks Input & States */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={comp.max_marks}
                          placeholder="Marks"
                          disabled={markStatus === 'absent' || markStatus === 'not_held'}
                          value={
                            markStatus === 'entered' && mark?.obtained_marks !== null && mark?.obtained_marks !== undefined
                              ? mark.obtained_marks
                              : ''
                          }
                          onChange={e => handleMarkChange(comp.id, e.target.value)}
                          className="w-20 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white disabled:opacity-40"
                        />

                        {/* Absent Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (markStatus === 'absent') {
                              handleMarkChange(comp.id, '');
                            } else {
                              handleSetAbsent(comp.id);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[34px] border ${
                            markStatus === 'absent'
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200'
                          }`}
                          title="Student was absent (evaluates to 0)"
                        >
                          <UserX className="w-3.5 h-3.5" />
                        </button>

                        {/* Not Held Toggle Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (markStatus === 'not_held') {
                              handleMarkChange(comp.id, '0');
                            } else {
                              handleSetNotHeld(comp.id);
                            }
                          }}
                          className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[34px] border ${
                            markStatus === 'not_held'
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-200'
                          }`}
                          title="Not yet conducted / held"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Edit & Delete Action Buttons */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(comp)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline px-1"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteAssessmentComponent(comp.id)}
                        className="text-gray-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add / Edit Form */}
        {isAddingComponent && (
          <form
            onSubmit={handleSaveComponent}
            className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3 animate-fade-in"
          >
            <h5 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
              {editingComponentId ? 'Edit Assessment Component' : 'Add New Component'}
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Component Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mid-Sem 1"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Maximum Marks
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={maxMarks}
                  onChange={e => setMaxMarks(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={weightage}
                  onChange={e => setWeightage(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                  Evaluation Rule
                </label>
                <select
                  value={rule}
                  onChange={e => setRule(e.target.value as AssessmentRuleType)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                >
                  <option value="normal">Normal (Simple Weight)</option>
                  <option value="best_of_N">Best of N</option>
                  <option value="drop_lowest">Drop Lowest</option>
                </select>
              </div>

              {rule !== 'normal' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      Rule Group ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. cat_group"
                      value={ruleGroup}
                      onChange={e => setRuleGroup(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-400 mb-1">
                      {rule === 'best_of_N' ? 'Pick Top N' : 'Drop Lowest Count'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={ruleParamN}
                      onChange={e => setRuleParamN(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold text-gray-900 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={isEndSem}
                  onChange={e => setIsEndSem(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                Is End-Semester Examination Component
              </label>

              <div className="flex items-center gap-2">
                <label className="text-[11px] font-bold text-gray-500">Min Pass Cutoff:</label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={minPassMarks}
                  onChange={e => setMinPassMarks(e.target.value)}
                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-xs font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700"
              >
                {editingComponentId ? 'Save Changes' : 'Create Component'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ResponsiveDialog>
  );
};
