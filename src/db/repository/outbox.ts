import { db } from '../database';
import { applyResult, due, isStale, type OutboxEntry } from '../../domain/xp/outbox';
import { sendSession, type FetchLike } from '../../xp/client';
import { getSettings, saveSettings } from './settings';

export interface FlushSummary {
  attempted: number;
  sent: number;
  /** Total XP HeartBeat reported crediting in this flush. */
  xp: number;
  dropped: number;
  needsReconnect: boolean;
}

const EMPTY: FlushSummary = { attempted: 0, sent: 0, xp: 0, dropped: 0, needsReconnect: false };

/**
 * Sends whatever is due, one at a time and oldest first.
 *
 * Sequential on purpose: HeartBeat's study endpoint has no rate limit of its
 * own, so this must not be the thing that hammers it. It stops at the first
 * 401, since every later entry would get the same answer, and it keeps every
 * entry it could not send.
 */
export async function flushOutbox(
  now: number,
  fetchImpl?: FetchLike,
): Promise<FlushSummary> {
  const settings = await getSettings();
  if (!settings.studyToken || settings.linkState === 'unlinked') return EMPTY;

  const all = await db.outbox.toArray();
  const stale = all.filter((entry) => isStale(entry, now));
  if (stale.length) await db.outbox.bulkDelete(stale.map((entry) => entry.sessionId));

  const summary: FlushSummary = { ...EMPTY, dropped: stale.length };
  const queue = due(
    all.filter((entry) => !stale.includes(entry)),
    now,
  );

  for (const entry of queue) {
    summary.attempted += 1;
    const result = await sendSession(settings.heartbeatOrigin, settings.studyToken, entry, fetchImpl);
    const updated: OutboxEntry = applyResult(entry, result, now);
    await db.outbox.put(updated);

    if (result.status === 'ok') {
      summary.sent += 1;
      summary.xp += result.xp;
    } else if (result.status === 'reconnect') {
      summary.needsReconnect = true;
      break;
    } else if (result.status === 'retry') {
      // Offline or the server is unwell: the rest would meet the same answer.
      break;
    }
  }

  if (summary.needsReconnect && settings.linkState !== 'needs-reconnect') {
    await saveSettings({ linkState: 'needs-reconnect' });
  } else if (summary.sent > 0 && settings.linkState === 'needs-reconnect') {
    await saveSettings({ linkState: 'linked' });
  }
  return summary;
}

/** Unsent entries, for the "waiting to send" line on the Me screen. */
export async function pendingCount(): Promise<number> {
  const rows = await db.outbox.toArray();
  return rows.filter((row) => row.sentAt === undefined && row.rejectedAt === undefined).length;
}

/** XP HeartBeat has confirmed crediting on the sessions of one day. */
export async function creditedOn(sessionIds: readonly string[]): Promise<number> {
  const rows = await db.outbox.bulkGet([...sessionIds]);
  return rows.reduce((n, row) => n + (row?.xp ?? 0), 0);
}
