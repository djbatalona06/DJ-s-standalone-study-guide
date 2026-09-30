import { useLiveQuery } from 'dexie-react-hooks';
import type { Stage } from '../art/sprites';
import { PATHWAY } from '../content/pathway';
import { loadMarks } from '../db/repository';
import { stageOf, statuses, type Mark } from '../domain/pathway/pathway';

/** What has been marked on the career path. `undefined` while it loads. */
export function usePathMarks(): Map<string, Mark> | undefined {
  return useLiveQuery(() => loadMarks(), []);
}

/** The character's stage, which follows the career path. Foundations until it loads. */
export function useStage(): Stage {
  const marks = usePathMarks();
  return marks ? stageOf(PATHWAY, statuses(PATHWAY, marks)) : 'Foundations';
}
