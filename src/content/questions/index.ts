import type { Question, TrackId } from '../types';

/**
 * Tracks that have a question bank. Kept as plain data so the Learn screen can
 * offer a quiz without loading the bank; a test keeps it honest.
 */
export const TRACKS_WITH_QUESTIONS: readonly TrackId[] = ['a1', 'a2'];

/** Banks are their own chunks: nobody downloads them until they open a quiz. */
const LOADERS: Partial<Record<TrackId, () => Promise<{ default: Question[] }>>> = {
  a1: () => import('./a1'),
  a2: () => import('./a2'),
};

export async function loadBank(trackId: TrackId): Promise<Question[]> {
  const load = LOADERS[trackId];
  return load ? (await load()).default : [];
}
