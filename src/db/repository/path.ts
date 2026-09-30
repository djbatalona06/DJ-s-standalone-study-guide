import { db } from '../database';
import type { Mark } from '../../domain/pathway/pathway';

/** What has been marked, by node id. Untouched nodes are absent. */
export async function loadMarks(): Promise<Map<string, Mark>> {
  const rows = await db.pathProgress.toArray();
  return new Map(rows.map((row) => [row.nodeId, row.status]));
}

/**
 * Records what the learner did with a node. `null` reopens it (the row goes
 * away). Starting keeps an earlier start time, and finishing keeps it too, so
 * "started on, done on" survives being marked twice.
 */
export async function setMark(nodeId: string, mark: Mark | null, at: number): Promise<void> {
  await db.transaction('rw', db.pathProgress, async () => {
    if (mark === null) {
      await db.pathProgress.delete(nodeId);
      return;
    }
    const before = await db.pathProgress.get(nodeId);
    await db.pathProgress.put({
      nodeId,
      status: mark,
      startedAt: before?.startedAt ?? at,
      doneAt: mark === 'done' ? at : undefined,
      updatedAt: at,
    });
  });
}
