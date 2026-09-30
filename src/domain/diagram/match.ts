import { place, scoreLabels } from './diagram';

/**
 * Match mode: like Label, but every pair is checked the moment it is made.
 * A right pair locks; a wrong one is remembered so the score can count
 * first-try matches, and the learner tries again.
 */
export interface MatchState {
  /** `partId → label` for pairs that were right. */
  matched: Record<string, string | undefined>;
  /** Labels that were put on a wrong part at least once. */
  missed: string[];
}

export const EMPTY_MATCH: MatchState = { matched: {}, missed: [] };

type Part = { id: string; label: string };

/** Tries `label` on `partId`. A locked part or an unknown id changes nothing. */
export function tryMatch(
  parts: ReadonlyArray<Part>,
  state: MatchState,
  partId: string,
  label: string,
): { state: MatchState; correct: boolean } {
  const part = parts.find((p) => p.id === partId);
  if (!part || state.matched[partId] !== undefined) return { state, correct: false };
  if (part.label === label) {
    return { state: { ...state, matched: place(state.matched, partId, label) }, correct: true };
  }
  const missed = state.missed.includes(label) ? state.missed : [...state.missed, label];
  return { state: { ...state, missed }, correct: false };
}

/** How many parts are matched, how many were right first time, and whether it is over. */
export function matchScore(parts: ReadonlyArray<Part>, state: MatchState) {
  const score = scoreLabels(parts, state.matched);
  const firstTry = parts.filter((p) => score.correct.includes(p.id) && !state.missed.includes(p.label)).length;
  return { matched: score.correct.length, firstTry, done: score.complete };
}
