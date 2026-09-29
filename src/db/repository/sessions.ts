import { db, type SessionRow } from '../database';
import type { TrackId } from '../../content/types';
import { KIND_FOR, MIN_CARDS_FOR_XP, newSessionId, type SessionMode } from '../../domain/xp/kinds';
import type { DayKey } from '../../domain/day';

export async function startSession(
  mode: SessionMode,
  trackId: TrackId,
  day: DayKey,
  at: number,
): Promise<SessionRow> {
  const row: SessionRow = {
    id: newSessionId(),
    mode,
    trackId,
    startedAt: at,
    reviewed: 0,
    correct: 0,
    activeMs: 0,
    dayKey: day,
  };
  await db.sessions.put(row);
  return row;
}

export interface SessionResult {
  reviewed: number;
  correct: number;
  activeMs: number;
}

/**
 * Ends a session and queues its XP in the same transaction, so a session that
 * happened can never be lost between "done" and "queued". A session shorter than
 * `MIN_CARDS_FOR_XP` is recorded but earns nothing and queues nothing.
 */
export async function finishSession(
  sessionId: string,
  result: SessionResult,
  at: number,
): Promise<{ queued: boolean }> {
  return db.transaction('rw', db.sessions, db.outbox, async () => {
    const session = await db.sessions.get(sessionId);
    if (!session) return { queued: false };
    await db.sessions.put({ ...session, ...result, endedAt: at });
    if (result.reviewed < MIN_CARDS_FOR_XP) return { queued: false };
    const existing = await db.outbox.get(sessionId);
    if (existing) return { queued: false };
    await db.outbox.put({
      sessionId,
      kind: KIND_FOR[session.mode],
      at,
      attempts: 0,
      nextAttemptAt: 0,
    });
    return { queued: true };
  });
}

/** Sessions finished on one day, for the Today screen. */
export async function sessionsOn(day: DayKey): Promise<SessionRow[]> {
  const rows = await db.sessions.where('dayKey').equals(day).toArray();
  return rows.filter((row) => row.endedAt !== undefined);
}
