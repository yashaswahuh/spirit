/**
 * Term Repository
 * Manages term settings: start/end dates, term attendance threshold, working days, and period timings.
 */

import { db } from '../dexie';
import { Term, Weekday, PeriodTiming } from '../../types';
import { termSchema, validateEntity } from '../schemas';

export async function getTerms(): Promise<Term[]> {
  return db.term.filter(t => t.deleted_at === null).toArray();
}

export async function getActiveTerm(): Promise<Term | null> {
  const terms = await getTerms();
  return terms.find(t => t.status === 'ongoing') || terms[0] || null;
}

export async function updateTermSettings(
  id: string,
  updates: {
    start_date?: string;
    end_date?: string;
    attendance_threshold?: number;
    working_days?: Weekday[];
    period_timings?: PeriodTiming[];
    name?: string;
  }
): Promise<Term> {
  const existing = await db.term.get(id);
  if (!existing || existing.deleted_at) {
    throw new Error(`Term ${id} not found`);
  }

  const updated: Term = {
    ...existing,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  validateEntity(termSchema, updated);
  await db.term.put(updated);
  return updated;
}
