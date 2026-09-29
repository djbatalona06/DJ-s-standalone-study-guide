import { describe, expect, it } from 'vitest';
import { BACKOFF_CAP_MS, applyResult, backoffMs, classify, due, isStale, type OutboxEntry } from './outbox';
import { KIND_FOR, SESSION_ID_PATTERN, XP_KINDS, XP_VALUE, newSessionId } from './kinds';

const entry = (patch: Partial<OutboxEntry> = {}): OutboxEntry => ({
  sessionId: 'ln_abcdef123456', kind: 'deck', at: 1000, attempts: 0, nextAttemptAt: 0, ...patch,
});

describe('backoff', () => {
  it('doubles from two seconds and stops at five minutes', () => {
    expect([1, 2, 3, 4].map(backoffMs)).toEqual([2000, 4000, 8000, 16000]);
    expect(backoffMs(30)).toBe(BACKOFF_CAP_MS);
  });
});

describe('classify', () => {
  it('reads a credit and a duplicate', () => {
    expect(classify(200, { ok: true, xp: 20 })).toEqual({ status: 'ok', xp: 20, duplicate: false });
    expect(classify(200, { ok: true, xp: 0, duplicate: true })).toEqual({ status: 'ok', xp: 0, duplicate: true });
  });

  it('treats 200 with xp 0 as success, never an error: the day is simply maxed', () => {
    expect(classify(200, { ok: true, xp: 0 }).status).toBe('ok');
  });

  it('asks to reconnect on 401, rejects on 400, retries on anything else', () => {
    expect(classify(401, {}).status).toBe('reconnect');
    expect(classify(400, {}).status).toBe('rejected');
    expect(classify(500, {}).status).toBe('retry');
    expect(classify(429, {}).status).toBe('retry');
  });
});

describe('applyResult', () => {
  it('marks a sent entry and keeps the answer', () => {
    const next = applyResult(entry(), { status: 'ok', xp: 20, duplicate: false }, 5000);
    expect(next).toMatchObject({ sentAt: 5000, xp: 20, duplicate: false });
  });

  it('backs off a retry and counts the attempt', () => {
    const next = applyResult(entry(), { status: 'retry', reason: 'HTTP 500' }, 10_000);
    expect(next.attempts).toBe(1);
    expect(next.nextAttemptAt).toBe(12_000);
  });

  it('keeps an entry through a revoked link, so nothing is lost', () => {
    const next = applyResult(entry(), { status: 'reconnect' }, 10_000);
    expect(next.sentAt).toBeUndefined();
    expect(next.rejectedAt).toBeUndefined();
  });

  it('never retries something the server refused for good', () => {
    const rejected = applyResult(entry(), { status: 'rejected', reason: 'no' }, 10_000);
    expect(due([rejected], 99_999_999)).toEqual([]);
  });
});

describe('due', () => {
  it('returns unsent entries whose time has come, oldest first', () => {
    const list = [
      entry({ sessionId: 'ln_late_0001', at: 3000 }),
      entry({ sessionId: 'ln_early_001', at: 1000 }),
      entry({ sessionId: 'ln_wait_0001', at: 2000, nextAttemptAt: 9_999 }),
      entry({ sessionId: 'ln_sent_0001', at: 500, sentAt: 600 }),
    ];
    expect(due(list, 5000).map((e) => e.sessionId)).toEqual(['ln_early_001', 'ln_late_0001']);
  });

  it('flags an entry too old to keep', () => {
    expect(isStale(entry({ at: 0 }), 31 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(isStale(entry({ at: 0, sentAt: 1 }), 31 * 24 * 60 * 60 * 1000)).toBe(false);
  });
});

describe('kinds', () => {
  it('maps every mode this app can finish onto a kind HeartBeat pays for', () => {
    for (const kind of Object.values(KIND_FOR)) expect(XP_KINDS).toContain(kind);
    for (const kind of XP_KINDS) expect(XP_VALUE[kind]).toBeGreaterThan(0);
  });

  it('generates session ids HeartBeat will accept, and no two alike', () => {
    const a = newSessionId();
    expect(a).toMatch(SESSION_ID_PATTERN);
    expect(newSessionId()).not.toBe(a);
  });
});
