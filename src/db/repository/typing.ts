import { db, type TypingStageRow } from '../database';
import type { TrackId } from '../../content/types';

const rowId = (trackId: TrackId, n: number) => `${trackId}-${n}`;

/** Every stage of a track that has been tried. Untouched stages are absent. */
export async function typingProgress(trackId: TrackId): Promise<TypingStageRow[]> {
  return db.typingStages.where('trackId').equals(trackId).toArray();
}

/**
 * Records one finished stage attempt. A clear is permanent and a best speed only
 * ever rises, so replaying a stage and losing it costs nothing.
 */
export async function recordStage(
  trackId: TrackId,
  n: number,
  result: { cleared: boolean; wpm: number },
  at: number,
): Promise<void> {
  const id = rowId(trackId, n);
  await db.transaction('rw', db.typingStages, async () => {
    const before = await db.typingStages.get(id);
    await db.typingStages.put({
      id,
      trackId,
      n,
      clears: (before?.clears ?? 0) + (result.cleared ? 1 : 0),
      bestWpm: Math.max(before?.bestWpm ?? 0, result.wpm),
      lastAt: at,
    });
  });
}
