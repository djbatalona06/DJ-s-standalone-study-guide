import Dexie, { type Table } from 'dexie';
import type { CardState, Grade } from '../domain/srs/srs';
import type { OutboxEntry } from '../domain/xp/outbox';
import type { SessionMode } from '../domain/xp/kinds';
import type { Answer, TrackId } from '../content/types';

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

/** One answered practice or exam question. Blanks are not rows: they were never attempted. */
export interface QuizAnswerRow {
  id: string;
  questionId: string;
  domainId: string;
  correct: boolean;
  at: number;
  sessionId: string;
}

/**
 * A practice exam, from the first question to the score. Saved on every change
 * so a reload resumes it. `id` is the session id, which is also the XP `sessionId`.
 */
export interface ExamRow {
  id: string;
  trackId: TrackId;
  /** In the order they are shown. */
  questionIds: string[];
  answers: Record<string, Answer>;
  flagged: string[];
  index: number;
  /** Saved whenever the clock pauses or an answer is given; never counts hidden time. */
  remainingMs: number;
  totalMs: number;
  status: 'active' | 'done';
  startedAt: number;
  finishedAt?: number;
  correct?: number;
  total: number;
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
  /** What the learner named the character. Typed in at onboarding; never a default. */
  characterName: string;
  /** Tracks shown on Today, picked at onboarding. */
  tracks: TrackId[];
  /** Set when onboarding finishes. Missing means the welcome screen still runs. */
  onboardedAt?: number;
  schemaVersion: number;
}

export class LanternDB extends Dexie {
  cardState!: Table<CardState, string>;
  reviewLog!: Table<ReviewLogRow, string>;
  sessions!: Table<SessionRow, string>;
  outbox!: Table<OutboxEntry, string>;
  settings!: Table<SettingsRow, string>;
  quizAnswers!: Table<QuizAnswerRow, string>;
  exams!: Table<ExamRow, string>;

  constructor(name = 'lantern') {
    super(name);
    this.version(1).stores({
      cardState: 'cardId, dueOn, introducedOn',
      reviewLog: 'id, cardId, at, sessionId',
      sessions: 'id, endedAt, dayKey',
      outbox: 'sessionId, nextAttemptAt',
      settings: 'id',
    });
    // Quizzes and exams. Only the new tables are listed; the rest carry over.
    this.version(2).stores({
      quizAnswers: 'id, questionId, domainId, at, sessionId',
      exams: 'id, trackId, status',
    });
  }
}

export const db = new LanternDB();
