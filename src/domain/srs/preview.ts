import type { DayKey } from '../day';
import { GRADES, newState, review, type CardState, type Grade } from './srs';

/** What each grade button would schedule, so the button can say so. */
export function previewIntervals(
  state: CardState | undefined,
  cardId: string,
  day: DayKey,
  at: number,
): Record<Grade, number> {
  const current = state ?? newState(cardId, day, at);
  return Object.fromEntries(
    GRADES.map((grade) => [grade, review(current, grade, day, at).interval]),
  ) as Record<Grade, number>;
}

/** "today", "1 d", "3 wk", "4 mo", "1 y": short enough for a thumb-sized button. */
export function intervalLabel(days: number): string {
  if (days <= 0) return 'today';
  if (days < 14) return `${days} d`;
  if (days < 60) return `${Math.round(days / 7)} wk`;
  if (days < 365) return `${Math.round(days / 30)} mo`;
  return `${Math.round(days / 365)} y`;
}
