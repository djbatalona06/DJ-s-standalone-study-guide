import { addDays, daysBetween, type DayKey } from '../day';

/**
 * The scheduler: SM-2 with the punishment taken out.
 *
 * Ported from HeartBeat's `domain/study/srs.ts` and kept behaviourally the same
 * on purpose, so a card does not change how it is scheduled depending on which
 * app you met it in. `again` brings a card back today and dents its ease; it
 * never resets the card to the start, because forgetting a fact is ordinary and
 * nothing here takes anything away for it.
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy';
export const GRADES: Grade[] = ['again', 'hard', 'good', 'easy'];

export interface CardState {
  cardId: string;
  /** SM-2's ease factor, clamped. */
  ease: number;
  /** Days from the last review to the next. Zero means "again, today". */
  interval: number;
  /** Consecutive reviews graded `hard` or better. Reset by `again`. */
  streak: number;
  dueOn: DayKey;
  /** The day the card was first answered, so a day's new-card intake can be counted. */
  introducedOn?: DayKey;
  lastReviewedOn?: DayKey;
  reviews: number;
  /** Times a card that was already known came back blank. A count, never a cost. */
  lapses: number;
  suspended?: boolean;
  updatedAt: number;
}

export const EASE_START = 2.5;
export const EASE_FLOOR = 1.3;
export const EASE_CEILING = 3;

/** `again` sits at 2, not 0: 0 costs 0.8 ease in one press, 2 costs 0.32. */
const QUALITY: Record<Grade, number> = { again: 2, hard: 3, good: 4, easy: 5 };

export function clampEase(ease: number): number {
  if (Number.isNaN(ease)) return EASE_START;
  return Math.max(EASE_FLOOR, Math.min(EASE_CEILING, ease));
}

export function adjustEase(ease: number, grade: Grade): number {
  const q = QUALITY[grade];
  return clampEase(ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
}

export const FIRST_INTERVAL = 1;
export const SECOND_INTERVAL = 6;
export const MAX_INTERVAL = 365;
export const HARD_FACTOR = 1.2;
export const EASY_BONUS = 1.3;

export function nextInterval(
  state: Pick<CardState, 'interval' | 'streak'>,
  grade: Grade,
  ease: number,
): number {
  if (grade === 'again') return 0;
  if (state.streak === 0) return grade === 'easy' ? SECOND_INTERVAL : FIRST_INTERVAL;
  if (state.streak === 1) return grade === 'hard' ? FIRST_INTERVAL * 2 : SECOND_INTERVAL;

  const factor = grade === 'hard' ? HARD_FACTOR : ease;
  const grown = Math.max(state.interval + 1, Math.round(state.interval * factor));
  const withBonus = grade === 'easy' ? Math.round(grown * EASY_BONUS) : grown;
  return Math.min(MAX_INTERVAL, withBonus);
}

/** A card nobody has graded yet. Due the day it is introduced. */
export function newState(cardId: string, day: DayKey, at: number): CardState {
  return {
    cardId,
    ease: EASE_START,
    interval: 0,
    streak: 0,
    dueOn: day,
    reviews: 0,
    lapses: 0,
    updatedAt: at,
  };
}

/** One press of one of the four buttons. Pure and total. */
export function review(state: CardState, grade: Grade, day: DayKey, at: number): CardState {
  const ease = adjustEase(state.ease, grade);
  const interval = nextInterval(state, grade, ease);
  const lapsed = grade === 'again' && state.reviews > 0;
  return {
    ...state,
    ease,
    interval,
    streak: grade === 'again' ? 0 : state.streak + 1,
    dueOn: addDays(day, interval),
    introducedOn: state.introducedOn ?? day,
    lastReviewedOn: day,
    reviews: state.reviews + 1,
    lapses: state.lapses + (lapsed ? 1 : 0),
    updatedAt: at,
  };
}

/** Due today, or overdue. A card scheduled for tomorrow is not offered early. */
export function isDue(state: Pick<CardState, 'dueOn'>, day: DayKey): boolean {
  return daysBetween(state.dueOn, day) >= 0;
}

/** How many days late. Negative for a card not yet due; used only for ordering. */
export function overdueBy(state: Pick<CardState, 'dueOn'>, day: DayKey): number {
  return daysBetween(state.dueOn, day);
}
