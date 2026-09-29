import type { DayKey } from '../day';
import { isDue, overdueBy, type CardState } from './srs';

/** How many never-seen cards a day introduces. */
export const NEW_PER_DAY = 12;
/** The most one session offers. */
export const MAX_QUEUE = 40;

export interface QueueOptions {
  newPerDay?: number;
  max?: number;
  /** Introduced today already, so a second session in a day does not double the intake. */
  introducedToday?: number;
}

/**
 * Today's queue: due cards first, most overdue first, then new ones.
 *
 * Due work comes before new work without exception. Meeting new material while
 * a backlog grows behind it is the failure mode of every spaced-repetition app,
 * and the only reliable fix is to refuse to introduce more.
 */
export function buildQueue(
  cardIds: readonly string[],
  states: ReadonlyMap<string, CardState>,
  day: DayKey,
  options: QueueOptions = {},
): string[] {
  const newPerDay = Math.max(0, (options.newPerDay ?? NEW_PER_DAY) - (options.introducedToday ?? 0));
  const max = options.max ?? MAX_QUEUE;

  const seen: Array<{ id: string; late: number; rank: number }> = [];
  const fresh: string[] = [];

  cardIds.forEach((id, rank) => {
    const state = states.get(id);
    if (!state) {
      fresh.push(id);
      return;
    }
    if (state.suspended) return;
    if (isDue(state, day)) seen.push({ id, late: overdueBy(state, day), rank });
  });

  seen.sort((a, b) => b.late - a.late || a.rank - b.rank);

  const due = seen.slice(0, max).map((entry) => entry.id);
  const room = Math.max(0, Math.min(max - due.length, newPerDay));
  return due.concat(fresh.slice(0, room));
}

export function dueCount(
  cardIds: readonly string[],
  states: ReadonlyMap<string, CardState>,
  day: DayKey,
): number {
  return cardIds.reduce((n, id) => {
    const state = states.get(id);
    return n + (state && !state.suspended && isDue(state, day) ? 1 : 0);
  }, 0);
}

/** A card graded `again` goes to the back of the queue, so it comes round again this session. */
export function requeue<T>(queue: readonly T[], index: number): T[] {
  if (index < 0 || index >= queue.length) return [...queue];
  return [...queue.slice(0, index), ...queue.slice(index + 1), queue[index]];
}
