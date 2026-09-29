import { beforeEach, describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { db } from '../database';
import {
  creditedOn, exportProgress, finishSession, flushOutbox, getSettings, gradeCard, importProgress,
  introducedOn, linkHeartBeat, loadStates, parseBackup, pendingCount, saveSettings, sessionsOn,
  startSession, unlinkHeartBeat,
} from './index';
import type { FetchLike } from '../../xp/client';
import { MIN_CARDS_FOR_XP } from '../../domain/xp/kinds';

const DAY = '2026-03-10';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

/** A fetch that answers with whatever it is told, and records what it was asked. */
function fakeFetch(status: number, body: unknown = {}) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const impl: FetchLike = async (url, init) => {
    calls.push({ url, init: init ?? {} });
    return new Response(JSON.stringify(body), { status });
  };
  return { impl, calls };
}

async function finishedSession(reviewed = 5) {
  const session = await startSession('review', 'cs50', DAY, 1000);
  await finishSession(session.id, { reviewed, correct: 3, activeMs: 60_000 }, 2000);
  return session.id;
}

describe('the barrel', () => {
  it('exports every section file, so adding one and forgetting the line fails here', () => {
    const dir = fileURLToPath(new URL('.', import.meta.url));
    const barrel = readFileSync(join(dir, 'index.ts'), 'utf8');
    const sections = readdirSync(dir).filter(
      (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !['index.ts', 'shared.ts'].includes(f),
    );
    for (const file of sections) expect(barrel).toContain(`'./${file.replace('.ts', '')}'`);
  });
});

describe('grading', () => {
  it('writes the schedule and the log that explains it together', async () => {
    const state = await gradeCard('c1', 'good', 's1', DAY, 1000);
    expect(state.dueOn).toBe('2026-03-11');
    expect((await loadStates()).get('c1')?.reviews).toBe(1);
    const log = await db.reviewLog.toArray();
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ cardId: 'c1', grade: 'good', prevInterval: 0, nextInterval: 1 });
  });

  it('counts a card as introduced on the day it is first answered, once', async () => {
    await gradeCard('c1', 'good', 's1', DAY, 1000);
    await gradeCard('c1', 'good', 's1', '2026-03-11', 2000);
    await gradeCard('c2', 'again', 's1', DAY, 3000);
    expect(await introducedOn(DAY)).toBe(2);
    expect(await introducedOn('2026-03-11')).toBe(0);
  });
});

describe('finishing a session', () => {
  it('queues its XP under the session id, and only once', async () => {
    const id = await finishedSession();
    const [entry] = await db.outbox.toArray();
    expect(entry).toMatchObject({ sessionId: id, kind: 'deck', attempts: 0 });
    expect((await finishSession(id, { reviewed: 5, correct: 3, activeMs: 1 }, 3000)).queued).toBe(false);
    expect(await db.outbox.count()).toBe(1);
  });

  it('queues nothing for a session too short to count, so micro-sessions cannot farm XP', async () => {
    await finishedSession(0);
    await finishedSession(MIN_CARDS_FOR_XP - 1);
    expect(await db.outbox.count()).toBe(0);
    expect(await sessionsOn(DAY)).toHaveLength(2);
    await finishedSession(MIN_CARDS_FOR_XP);
    expect(await db.outbox.count()).toBe(1);
  });
});

describe('sending XP', () => {
  it('does nothing until the app is linked', async () => {
    await finishedSession();
    const { impl, calls } = fakeFetch(200, { xp: 20 });
    expect((await flushOutbox(10_000, impl)).attempted).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it('sends the reused session id with the token in the header, and records the credit', async () => {
    const id = await finishedSession();
    await linkHeartBeat('  tok_123\n', 'https://hb.example/');
    const { impl, calls } = fakeFetch(200, { ok: true, xp: 20 });

    const summary = await flushOutbox(10_000, impl);
    expect(summary).toMatchObject({ attempted: 1, sent: 1, xp: 20, needsReconnect: false });
    expect(calls[0].url).toBe('https://hb.example/api/study/session');
    expect((calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer tok_123');
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({ sessionId: id, kind: 'deck' });
    expect(await pendingCount()).toBe(0);
    expect(await creditedOn([id])).toBe(20);
  });

  it('does not send the same session twice', async () => {
    await finishedSession();
    await linkHeartBeat('tok');
    const { impl, calls } = fakeFetch(200, { xp: 20 });
    await flushOutbox(10_000, impl);
    await flushOutbox(20_000, impl);
    expect(calls).toHaveLength(1);
  });

  it('keeps everything and asks to reconnect on a 401, then recovers on the next good send', async () => {
    await finishedSession();
    await linkHeartBeat('old-token');
    const bad = await flushOutbox(10_000, fakeFetch(401).impl);
    expect(bad.needsReconnect).toBe(true);
    expect((await getSettings()).linkState).toBe('needs-reconnect');
    expect(await pendingCount()).toBe(1);

    await linkHeartBeat('new-token');
    await saveSettings({ linkState: 'needs-reconnect' });
    const good = await flushOutbox(20_000, fakeFetch(200, { xp: 20 }).impl);
    expect(good.sent).toBe(1);
    expect((await getSettings()).linkState).toBe('linked');
  });

  it('backs off after a server error and tries again later', async () => {
    await finishedSession();
    await linkHeartBeat('tok');
    await flushOutbox(10_000, fakeFetch(500).impl);
    const [entry] = await db.outbox.toArray();
    expect(entry.attempts).toBe(1);
    expect(entry.nextAttemptAt).toBe(12_000);
    expect((await flushOutbox(11_000, fakeFetch(200, { xp: 20 }).impl)).attempted).toBe(0);
    expect((await flushOutbox(12_000, fakeFetch(200, { xp: 20 }).impl)).sent).toBe(1);
  });

  it('treats being offline as a retry, not an error', async () => {
    await finishedSession();
    await linkHeartBeat('tok');
    const offline: FetchLike = async () => { throw new TypeError('Failed to fetch'); };
    const summary = await flushOutbox(10_000, offline);
    expect(summary.needsReconnect).toBe(false);
    expect(await pendingCount()).toBe(1);
  });

  it('forgets the token on unlink but keeps the queue', async () => {
    await finishedSession();
    await linkHeartBeat('tok');
    const after = await unlinkHeartBeat();
    expect(after.studyToken).toBeUndefined();
    expect(after.linkState).toBe('unlinked');
    expect(await pendingCount()).toBe(1);
  });
});

describe('backup', () => {
  it('round-trips progress and never contains the token', async () => {
    await gradeCard('c1', 'good', 's1', DAY, 1000);
    await finishedSession();
    await linkHeartBeat('super-secret-token');

    const file = await exportProgress(5000);
    expect(JSON.stringify(file)).not.toContain('super-secret-token');

    await db.delete();
    await db.open();
    const parsed = parseBackup(JSON.stringify(file));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const summary = await importProgress(parsed.file);
    expect(summary).toMatchObject({ cardsAdded: 1, reviewsAdded: 1, sessionsAdded: 1 });
    expect((await loadStates()).get('c1')?.reviews).toBe(1);
  });

  it('keeps the copy of a card that was reviewed last, and never deletes', async () => {
    await gradeCard('c1', 'good', 's1', DAY, 1000);
    const older = await exportProgress(1);
    await gradeCard('c1', 'easy', 's2', DAY, 9000);

    const summary = await importProgress(older);
    expect(summary.cardsUpdated).toBe(0);
    expect((await loadStates()).get('c1')?.reviews).toBe(2);
    expect(await db.reviewLog.count()).toBe(2);
  });

  it('is idempotent: importing the same file twice adds nothing the second time', async () => {
    await gradeCard('c1', 'good', 's1', DAY, 1000);
    const file = await exportProgress(1);
    await importProgress(file);
    expect(await importProgress(file)).toMatchObject({ cardsAdded: 0, reviewsAdded: 0, sessionsAdded: 0 });
  });

  it('rejects things that are not a backup', () => {
    expect(parseBackup('nope')).toEqual({ ok: false, problem: 'not-json' });
    expect(parseBackup('{"app":"other"}')).toEqual({ ok: false, problem: 'not-lantern' });
    expect(parseBackup(JSON.stringify({
      app: 'lantern', schemaVersion: 99, cardState: [], reviewLog: [], sessions: [],
    }))).toEqual({ ok: false, problem: 'newer-version' });
  });
});
