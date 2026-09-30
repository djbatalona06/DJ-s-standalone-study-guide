import type { TrackId } from '../content/types';
import { domainsOf } from '../content';
import { readiness } from '../domain/mastery/readiness';
import { useQuizAccuracy, useRecentExams, useStates } from './useApp';
import { useLibrary } from './useLibrary';

/** A track's readiness (0–1) and its latest two practice-exam scores. `undefined` while it loads. */
export function useReadiness(trackId: TrackId): { readiness: number; exams: number[] } | undefined {
  const library = useLibrary();
  const states = useStates();
  const quiz = useQuizAccuracy();
  const exams = useRecentExams(trackId);
  if (!library || !states || !quiz || !exams) return undefined;
  const domains = domainsOf(trackId).map((d) => ({
    id: d.id, weight: d.weight, cardIds: library.cardsOfDomain(d.id).map((c) => c.id),
  }));
  return { readiness: readiness(domains, states, quiz).readiness, exams };
}
