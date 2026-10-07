/**
 * Spirit Assessment & Marks Repository Layer
 * Manages assessment components, component marks, quick templates, and final course grade results.
 */

import { db, LOCAL_USER_ID } from '../dexie';
import {
  AssessmentComponent,
  Mark,
  GradeResult,
  MarkStatus,
  AssessmentRuleType,
} from '../../types';

export interface AssessmentTemplateDef {
  key: string;
  name: string;
  description: string;
  components: Array<{
    name: string;
    max_marks: number;
    weightage: number;
    rule: AssessmentRuleType;
    rule_group?: string | null;
    rule_params?: { n?: number; count?: number } | null;
    is_end_sem: boolean;
    min_pass_marks?: number | null;
  }>;
}

export const ASSESSMENT_TEMPLATES: AssessmentTemplateDef[] = [
  {
    key: 'standard_40_60',
    name: 'Standard 40/60 Split',
    description: '2 Mid-Sems (15% each) + Assignments (10%) + End-Sem (60%)',
    components: [
      { name: 'Mid-Sem Exam 1', max_marks: 50, weightage: 15, rule: 'normal', is_end_sem: false },
      { name: 'Mid-Sem Exam 2', max_marks: 50, weightage: 15, rule: 'normal', is_end_sem: false },
      { name: 'Continuous Assignments', max_marks: 50, weightage: 10, rule: 'normal', is_end_sem: false },
      { name: 'End-Sem Exam', max_marks: 100, weightage: 60, rule: 'normal', is_end_sem: true, min_pass_marks: 35 },
    ],
  },
  {
    key: 'engineering_50_50',
    name: 'Engineering Best-of-2 (50/50 Split)',
    description: 'Best 1 of 2 Mid-Sems (25%) + Assignments (15%) + Lab Internal (10%) + End-Sem (50%)',
    components: [
      { name: 'Mid-Sem 1', max_marks: 50, weightage: 25, rule: 'best_of_N', rule_group: 'midsem_grp', rule_params: { n: 1 }, is_end_sem: false },
      { name: 'Mid-Sem 2', max_marks: 50, weightage: 25, rule: 'best_of_N', rule_group: 'midsem_grp', rule_params: { n: 1 }, is_end_sem: false },
      { name: 'Assignments & Quizzes', max_marks: 50, weightage: 15, rule: 'normal', is_end_sem: false },
      { name: 'Lab Internal', max_marks: 50, weightage: 10, rule: 'normal', is_end_sem: false },
      { name: 'End-Sem Exam', max_marks: 100, weightage: 50, rule: 'normal', is_end_sem: true, min_pass_marks: 35 },
    ],
  },
  {
    key: 'lab_only',
    name: 'Lab / Practical Only',
    description: 'Continuous Lab Performance (60%) + Final Lab Exam & Viva (40%)',
    components: [
      { name: 'Continuous Lab Evaluation', max_marks: 100, weightage: 60, rule: 'normal', is_end_sem: false },
      { name: 'Lab End-Sem & Viva', max_marks: 100, weightage: 40, rule: 'normal', is_end_sem: true, min_pass_marks: 40 },
    ],
  },
  {
    key: 'project_only',
    name: 'Project / Seminar Course',
    description: 'Progress Review 1 (20%) + Progress Review 2 (30%) + Final Report & Viva (50%)',
    components: [
      { name: 'Progress Review 1', max_marks: 50, weightage: 20, rule: 'normal', is_end_sem: false },
      { name: 'Progress Review 2', max_marks: 50, weightage: 30, rule: 'normal', is_end_sem: false },
      { name: 'Final Project Report & Viva', max_marks: 100, weightage: 50, rule: 'normal', is_end_sem: true, min_pass_marks: 50 },
    ],
  },
];

/**
 * Creates an assessment component for a course.
 */
export async function createAssessmentComponent(
  data: Omit<AssessmentComponent, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'deleted_at'>
): Promise<AssessmentComponent> {
  const now = new Date().toISOString();
  const component: AssessmentComponent = {
    ...data,
    id: crypto.randomUUID(),
    user_id: LOCAL_USER_ID,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  await db.assessment_component.add(component);
  return component;
}

/**
 * Updates an assessment component.
 */
export async function updateAssessmentComponent(
  id: string,
  data: Partial<Omit<AssessmentComponent, 'id' | 'user_id' | 'created_at'>>
): Promise<void> {
  await db.assessment_component.update(id, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}

/**
 * Deletes an assessment component and its associated mark.
 */
export async function deleteAssessmentComponent(id: string): Promise<void> {
  const now = new Date().toISOString();
  await db.assessment_component.update(id, { deleted_at: now });
  // Also soft-delete mark
  const marks = await db.mark.where('component_id').equals(id).toArray();
  for (const m of marks) {
    await db.mark.update(m.id, { deleted_at: now });
  }
}

/**
 * Applies a quick assessment template to a course, overwriting or creating components.
 */
export async function applyAssessmentTemplate(
  courseId: string,
  templateKey: string
): Promise<void> {
  const template = ASSESSMENT_TEMPLATES.find(t => t.key === templateKey);
  if (!template) return;

  const now = new Date().toISOString();

  // Archive existing active components for this course
  const existing = await db.assessment_component
    .where('course_id')
    .equals(courseId)
    .filter(c => c.deleted_at === null)
    .toArray();

  for (const c of existing) {
    await db.assessment_component.update(c.id, { deleted_at: now });
  }

  // Create template components
  for (const item of template.components) {
    await createAssessmentComponent({
      course_id: courseId,
      name: item.name,
      max_marks: item.max_marks,
      weightage: item.weightage,
      rule: item.rule,
      rule_group: item.rule_group || null,
      rule_params: item.rule_params || null,
      is_end_sem: item.is_end_sem,
      min_pass_marks: item.min_pass_marks || null,
    });
  }
}

/**
 * Saves or updates a mark for an assessment component.
 */
export async function saveMark(
  componentId: string,
  obtainedMarks: number | null,
  status: MarkStatus = 'entered'
): Promise<Mark> {
  const now = new Date().toISOString();
  const existing = await db.mark
    .where('component_id')
    .equals(componentId)
    .filter(m => m.deleted_at === null)
    .first();

  if (existing) {
    await db.mark.update(existing.id, {
      obtained_marks: obtainedMarks,
      status,
      updated_at: now,
    });
    return { ...existing, obtained_marks: obtainedMarks, status, updated_at: now };
  } else {
    const mark: Mark = {
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      component_id: componentId,
      obtained_marks: obtainedMarks,
      status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.mark.add(mark);
    return mark;
  }
}

/**
 * Saves or updates final grade result for a course.
 */
export async function saveGradeResult(
  courseId: string,
  data: {
    letter_grade: string | null;
    grade_points: number | null;
    attempt_number: number;
    is_passing: boolean;
    term_id?: string | null;
  }
): Promise<GradeResult> {
  const now = new Date().toISOString();
  const existing = await db.grade_result
    .where('course_id')
    .equals(courseId)
    .filter(gr => gr.deleted_at === null && gr.attempt_number === data.attempt_number)
    .first();

  if (existing) {
    await db.grade_result.update(existing.id, {
      ...data,
      updated_at: now,
    });
    return { ...existing, ...data, updated_at: now };
  } else {
    const result: GradeResult = {
      id: crypto.randomUUID(),
      user_id: LOCAL_USER_ID,
      course_id: courseId,
      term_id: data.term_id ?? null,
      letter_grade: data.letter_grade,
      grade_points: data.grade_points,
      attempt_number: data.attempt_number,
      is_passing: data.is_passing,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    };
    await db.grade_result.add(result);
    return result;
  }
}
