import { db } from '../database';
import { newState, review, type CardState, type Grade } from '../../domain/srs/srs';
import type { DayKey } from '../../domain/day';
import { id } from './shared';

export async function loadStates(): Promise<Map<string, CardState>> {
  const rows = await db.cardState.toArray();
  return new Map(rows.map((row) => [row.cardId, row]));
}

/** How many never-seen cards were answered for the first time on this day. */
export async function introducedOn(day: DayKey): Promise<number> {
  return db.cardState.where('introducedOn').equals(day).count();
}

/**
 * One grade, written atomically: the card's new schedule and the log row that
 * explains it. The log is the source of truth; the state can be rebuilt from it.
 */
export async function gradeCard(
  cardId: string,
  grade: Grade,
  sessionId: string,
  day: DayKey,
  at: number,
): Promise<CardState> {
  return db.transaction('rw', db.cardState, db.reviewLog, async () => {
    const before = (await db.cardState.get(cardId)) ?? newState(cardId, day, at);
    const after = review(before, grade, day, at);
    await db.cardState.put(after);
    await db.reviewLog.add({
      id: id(),
      cardId,
      at,
      grade,
      sessionId,
      prevInterval: before.interval,
      nextInterval: after.interval,
    });
    return after;
  });
}

/** Hides a card from every queue without losing its history. */
export async function setSuspended(cardId: string, suspended: boolean, at: number): Promise<void> {
  await db.transaction('rw', db.cardState, async () => {
    const state = await db.cardState.get(cardId);
    if (state) await db.cardState.put({ ...state, suspended, updatedAt: at });
  });
}
