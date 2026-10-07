import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../database';
import { exportProgress, importProgress, recordStage, typingProgress } from './index';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe('typing stages', () => {
  it('starts empty and records an attempt per track and stage', async () => {
    expect(await typingProgress('a1')).toEqual([]);
    await recordStage('a1', 1, { cleared: false, wpm: 0 }, 100);
    await recordStage('cs50', 1, { cleared: true, wpm: 30 }, 200);
    const a1 = await typingProgress('a1');
    expect(a1).toHaveLength(1);
    expect(a1[0]).toMatchObject({ id: 'a1-1', clears: 0, bestWpm: 0 });
    expect((await typingProgress('cs50'))[0]).toMatchObject({ clears: 1, bestWpm: 30 });
  });

  it('a clear is permanent and the best speed only rises, so losing a replay costs nothing', async () => {
    await recordStage('a1', 2, { cleared: true, wpm: 40 }, 100);
    await recordStage('a1', 2, { cleared: false, wpm: 25 }, 200);
    const [row] = await typingProgress('a1');
    expect(row).toMatchObject({ clears: 1, bestWpm: 40, lastAt: 200 });
    await recordStage('a1', 2, { cleared: true, wpm: 55 }, 300);
    expect((await typingProgress('a1'))[0]).toMatchObject({ clears: 2, bestWpm: 55 });
  });

  it('travels in a backup and merges by taking the best of each number', async () => {
    await recordStage('a2', 3, { cleared: true, wpm: 50 }, 100);
    const file = await exportProgress(1);
    expect(file.typingStages).toHaveLength(1);

    await db.delete();
    await db.open();
    await recordStage('a2', 3, { cleared: false, wpm: 60 }, 500);
    await importProgress(file);
    expect((await typingProgress('a2'))[0]).toMatchObject({ clears: 1, bestWpm: 60, lastAt: 500 });
  });

  it('imports a backup from before typing stages existed', async () => {
    const file = await exportProgress(1);
    delete file.typingStages;
    await expect(importProgress(file)).resolves.toBeDefined();
  });
});
