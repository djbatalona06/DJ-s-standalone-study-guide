import Dexie, { type Table } from 'dexie';
import type { CardState, Grade } from '../domain/srs/srs';
import type { OutboxEntry } from '../domain/xp/outbox';
import type { SessionMode } from '../domain/xp/kinds';
import type { TrackId } from '../content/types';

/**
 * Progress only. Content lives in the bundle, so a content update never
 * migrates user data: rows key on stable card ids.
 */
export interface ReviewLogRow {
  id: string;
  cardId: string;
  at: number;
  grade: Grade;
  sessionId: string;
  prevInterval: number;
  nextInterval: number;
}

export interface SessionRow {
  /** Also the XP `sessionId`, so a retry is the same session to HeartBeat. */
  id: string;
  mode: SessionMode;
  trackId: TrackId;
  startedAt: number;
  endedAt?: number;
  reviewed: number;
  correct: number;
  activeMs: number;
  dayKey: string;
}

export type LinkState = 'unlinked' | 'linked' | 'needs-reconnect';

export interface SettingsRow {
  id: 'me';
  timeZone: string;
  /** Where HeartBeat is deployed. The study token is only ever sent here. */
  heartbeatOrigin: string;
  /** Shown once by HeartBeat and pasted in. Never exported. */
  studyToken?: string;
  linkState: LinkState;
  /** How many never-seen cards a day introduces. */
  newPerDay: number;
  schemaVersion: number;
}

export class LanternDB extends Dexie {
  cardState!: Table<CardState, string>;
  reviewLog!: Table<ReviewLogRow, string>;
  sessions!: Table<SessionRow, string>;
  outbox!: Table<OutboxEntry, string>;
  settings!: Table<SettingsRow, string>;

  constructor(name = 'lantern') {
    super(name);
    this.version(1).stores({
      cardState: 'cardId, dueOn, introducedOn',
      reviewLog: 'id, cardId, at, sessionId',
      sessions: 'id, endedAt, dayKey',
      outbox: 'sessionId, nextAttemptAt',
      settings: 'id',
    });
  }
}

export const db = new LanternDB();
