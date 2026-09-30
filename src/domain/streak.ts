import { addDays, type DayKey } from './day';

/**
 * Days in a row with at least one finished session, counting back from today.
 *
 * A day not yet studied does not break the streak until it is over, so at
 * breakfast yesterday's run still counts. A broken streak is simply 0; the
 * screen says "Day 1" when you start again and never mentions what was lost.
 */
export function streak(studied: Iterable<DayKey>, today: DayKey): number {
  const days = new Set(studied);
  let day = days.has(today) ? today : addDays(today, -1);
  let count = 0;
  while (days.has(day)) {
    count++;
    day = addDays(day, -1);
  }
  return count;
}
