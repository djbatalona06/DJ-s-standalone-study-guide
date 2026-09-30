import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SettingsRow } from '../db/database';
import type { TrackId } from '../content/types';
import { defaultSettings, loadAnswerRows, recentExamScores } from '../db/repository';
import { quizAccuracy } from '../domain/mastery/quiz';
import { todayKey } from '../domain/day';
import type { CardState } from '../domain/srs/srs';

/**
 * The settings row, read without writing.
 *
 * `getSettings()` creates the row when it is missing, which is a write, and a
 * write inside a live query re-fires the query. HeartBeat learned this the hard
 * way (see its CLAUDE.md), so the boot code creates the row once and every
 * screen reads it through here.
 */
export function useSettings(): SettingsRow {
  const stored = useLiveQuery(() => db.settings.get('me'), []);
  return { ...defaultSettings(), ...stored };
}

/**
 * The settings row as stored: `undefined` while loading, `null` before the
 * boot code has created it. The shell uses this to decide on onboarding without
 * flashing the welcome screen at somebody who has already been through it.
 */
export function useSettingsRow(): SettingsRow | null | undefined {
  return useLiveQuery(async () => {
    const stored = await db.settings.get('me');
    return stored ? { ...defaultSettings(), ...stored } : null;
  }, []);
}

/** Every day with a finished session, for the streak. */
export function useStudyDays(): string[] | undefined {
  return useLiveQuery(async () => {
    const rows = await db.sessions.toArray();
    return rows.filter((row) => row.endedAt !== undefined).map((row) => row.dayKey);
  }, []);
}

export function useToday(): string {
  const { timeZone } = useSettings();
  return todayKey(timeZone);
}

/** Every card the learner has answered, keyed by id. `undefined` while it loads. */
export function useStates(): Map<string, CardState> | undefined {
  return useLiveQuery(async () => {
    const rows = await db.cardState.toArray();
    return new Map(rows.map((row) => [row.cardId, row]));
  }, []);
}

/** Recent quiz accuracy per domain, blended into mastery. `undefined` while it loads. */
export function useQuizAccuracy(): Map<string, number> | undefined {
  return useLiveQuery(async () => quizAccuracy(await loadAnswerRows()), []);
}

/** The latest two finished practice exams for a track (0–1, newest first). */
export function useRecentExams(trackId: TrackId): number[] | undefined {
  return useLiveQuery(() => recentExamScores(trackId, 2), [trackId]);
}
