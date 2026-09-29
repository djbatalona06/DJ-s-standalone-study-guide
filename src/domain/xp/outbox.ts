import type { XpKind } from './kinds';

/**
 * The offline queue for XP, as pure decisions.
 *
 * A session is queued the moment it ends and sent whenever the network allows.
 * The `sessionId` is generated once and reused on every retry, which is what
 * makes retrying free: HeartBeat records `study-<sessionId>` once and a replay
 * comes back as a duplicate worth nothing.
 */
export interface OutboxEntry {
  sessionId: string;
  kind: XpKind;
  /** When the session ended, on this device's clock. HeartBeat corrects a clock that is far out. */
  at: number;
  attempts: number;
  nextAttemptAt: number;
  lastError?: string;
  sentAt?: number;
  /** HeartBeat's answer, kept so the screen can say what was earned. */
  xp?: number;
  duplicate?: boolean;
  /** Refused for good (bad kind or id). Never retried. */
  rejectedAt?: number;
}

/** 2 s, 4 s, 8 s, 16 s, … capped at five minutes. */
export const BACKOFF_BASE_MS = 2000;
export const BACKOFF_CAP_MS = 5 * 60 * 1000;

export function backoffMs(attempts: number): number {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(BACKOFF_CAP_MS, BACKOFF_BASE_MS * 2 ** exponent);
}

/** Older than this and an unsent entry is dropped with a notice, not retried forever. */
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type SendResult =
  | { status: 'ok'; xp: number; duplicate: boolean }
  | { status: 'reconnect' }
  | { status: 'rejected'; reason: string }
  | { status: 'retry'; reason: string };

/** Turns HeartBeat's HTTP answer into what to do next. */
export function classify(status: number, body: unknown): SendResult {
  if (status === 200) {
    const data = (body ?? {}) as { xp?: unknown; duplicate?: unknown };
    return {
      status: 'ok',
      xp: typeof data.xp === 'number' ? data.xp : 0,
      duplicate: data.duplicate === true,
    };
  }
  // The link was revoked or replaced. Keep the queue; ask for a new token.
  if (status === 401) return { status: 'reconnect' };
  // The server is saying "never", not "not now": retrying would wedge the queue.
  if (status === 400) return { status: 'rejected', reason: 'HeartBeat refused this session' };
  return { status: 'retry', reason: `HTTP ${status}` };
}

/** Entries that should be sent now, oldest first. */
export function due(entries: readonly OutboxEntry[], now: number): OutboxEntry[] {
  return entries
    .filter((e) => e.sentAt === undefined && e.rejectedAt === undefined && e.nextAttemptAt <= now)
    .sort((a, b) => a.at - b.at);
}

/** Applies one send result to an entry. */
export function applyResult(entry: OutboxEntry, result: SendResult, now: number): OutboxEntry {
  switch (result.status) {
    case 'ok':
      return { ...entry, sentAt: now, xp: result.xp, duplicate: result.duplicate, lastError: undefined };
    case 'rejected':
      return { ...entry, rejectedAt: now, lastError: result.reason };
    case 'reconnect':
      return { ...entry, lastError: 'link revoked' };
    case 'retry': {
      const attempts = entry.attempts + 1;
      return { ...entry, attempts, nextAttemptAt: now + backoffMs(attempts), lastError: result.reason };
    }
  }
}

/** Whether an unsent entry is too old to keep. */
export function isStale(entry: OutboxEntry, now: number): boolean {
  return entry.sentAt === undefined && now - entry.at > MAX_AGE_MS;
}
