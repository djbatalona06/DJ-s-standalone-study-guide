import { db, type ExamRow, type QuizAnswerRow, type ReviewLogRow, type SessionRow } from '../database';
import type { CardState } from '../../domain/srs/srs';
import { SCHEMA_VERSION, cleanCharacterName, getSettings, saveSettings } from './settings';

/**
 * The backup file. Progress only: the study token is never in it, so a backup
 * can be emailed or pasted without handing over the link to HeartBeat.
 */
export interface BackupFile {
  app: 'lantern';
  schemaVersion: number;
  exportedAt: number;
  settings: { timeZone: string; newPerDay: number; heartbeatOrigin: string; characterName?: string };
  cardState: CardState[];
  reviewLog: ReviewLogRow[];
  sessions: SessionRow[];
  /** Added in schema 2; a backup from an older version simply lacks them. */
  quizAnswers?: QuizAnswerRow[];
  /** Finished exams only: an exam in progress is not something to carry to another device. */
  exams?: ExamRow[];
}

export async function exportProgress(at: number): Promise<BackupFile> {
  const settings = await getSettings();
  const [cardState, reviewLog, sessions, quizAnswers, exams] = await Promise.all([
    db.cardState.toArray(),
    db.reviewLog.toArray(),
    db.sessions.toArray(),
    db.quizAnswers.toArray(),
    db.exams.filter((e) => e.status === 'done').toArray(),
  ]);
  return {
    app: 'lantern',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: at,
    settings: {
      timeZone: settings.timeZone,
      newPerDay: settings.newPerDay,
      heartbeatOrigin: settings.heartbeatOrigin,
      characterName: settings.characterName,
    },
    cardState,
    reviewLog,
    sessions,
    quizAnswers,
    exams,
  };
}

export type ImportProblem = 'not-json' | 'not-lantern' | 'newer-version';

export interface ImportSummary {
  cardsAdded: number;
  cardsUpdated: number;
  reviewsAdded: number;
  sessionsAdded: number;
  answersAdded: number;
  examsAdded: number;
}

/** Parses and checks a backup without touching the database. */
export function parseBackup(text: string): { ok: true; file: BackupFile } | { ok: false; problem: ImportProblem } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'not-json' };
  }
  const file = data as Partial<BackupFile> | null;
  if (!file || file.app !== 'lantern' || !Array.isArray(file.cardState)
    || !Array.isArray(file.reviewLog) || !Array.isArray(file.sessions)) {
    return { ok: false, problem: 'not-lantern' };
  }
  if (typeof file.schemaVersion === 'number' && file.schemaVersion > SCHEMA_VERSION) {
    return { ok: false, problem: 'newer-version' };
  }
  return { ok: true, file: file as BackupFile };
}

/**
 * Merges a backup into this device without ever deleting anything.
 *
 * - A card keeps whichever copy was reviewed last.
 * - Review logs, sessions, quiz answers and finished exams are unioned by id.
 * - Settings and the study token stay as they are here, except that a device
 *   whose character has no name yet takes the backup's.
 */
export async function importProgress(file: BackupFile): Promise<ImportSummary> {
  const summary: ImportSummary = { cardsAdded: 0, cardsUpdated: 0, reviewsAdded: 0, sessionsAdded: 0, answersAdded: 0, examsAdded: 0 };

  await db.transaction('rw', db.cardState, db.reviewLog, db.sessions, db.quizAnswers, db.exams, async () => {
    for (const incoming of file.cardState) {
      const local = await db.cardState.get(incoming.cardId);
      if (!local) {
        await db.cardState.put(incoming);
        summary.cardsAdded += 1;
      } else if (incoming.updatedAt > local.updatedAt) {
        await db.cardState.put(incoming);
        summary.cardsUpdated += 1;
      }
    }
    const knownLogs = new Set(await db.reviewLog.toCollection().primaryKeys());
    const newLogs = file.reviewLog.filter((row) => !knownLogs.has(row.id));
    await db.reviewLog.bulkPut(newLogs);
    summary.reviewsAdded = newLogs.length;

    const knownSessions = new Set(await db.sessions.toCollection().primaryKeys());
    const newSessions = file.sessions.filter((row) => !knownSessions.has(row.id));
    await db.sessions.bulkPut(newSessions);
    summary.sessionsAdded = newSessions.length;

    const knownAnswers = new Set(await db.quizAnswers.toCollection().primaryKeys());
    const newAnswers = (file.quizAnswers ?? []).filter((row) => !knownAnswers.has(row.id));
    await db.quizAnswers.bulkPut(newAnswers);
    summary.answersAdded = newAnswers.length;

    const knownExams = new Set(await db.exams.toCollection().primaryKeys());
    const newExams = (file.exams ?? []).filter((row) => row.status === 'done' && !knownExams.has(row.id));
    await db.exams.bulkPut(newExams);
    summary.examsAdded = newExams.length;
  });

  const incomingName = cleanCharacterName(file.settings?.characterName ?? '');
  const local = await getSettings();
  await saveSettings(!local.characterName && incomingName ? { characterName: incomingName } : {});
  return summary;
}
