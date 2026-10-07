/**
 * Spirit Grading Scheme Repository Layer
 * Manages institutional grading schemes, letter-to-points mappings, and CGPA conversion rules.
 */

import { db } from '../dexie';
import { GradingScheme, GradingSchemeData } from '../../types';

export async function getActiveGradingScheme(): Promise<GradingScheme | undefined> {
  const program = await db.program.filter(p => p.deleted_at === null).first();
  if (program?.grading_scheme_id) {
    const scheme = await db.grading_scheme.get(program.grading_scheme_id);
    if (scheme && scheme.deleted_at === null) return scheme;
  }
  return db.grading_scheme.filter(g => g.deleted_at === null).first();
}

export async function updateGradingScheme(
  schemeId: string,
  data: {
    name?: string;
    scheme_data: GradingSchemeData;
  }
): Promise<void> {
  await db.grading_scheme.update(schemeId, {
    ...data,
    updated_at: new Date().toISOString(),
  });
}
