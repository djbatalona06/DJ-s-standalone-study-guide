/**
 * The exam timer as plain data, so "never runs while the tab is hidden" is a
 * tested rule rather than a hope. `since` is the moment it last started running,
 * or null while paused. Time only ever comes from the `now` you pass in.
 */
export interface Clock {
  remainingMs: number;
  since: number | null;
}

export const startClock = (totalMs: number, now: number): Clock => ({ remainingMs: totalMs, since: now });

/** A clock that is loaded but not ticking, e.g. an exam resumed after a reload. */
export const pausedClock = (remainingMs: number): Clock => ({ remainingMs, since: null });

export function remaining(clock: Clock, now: number): number {
  const ran = clock.since === null ? 0 : Math.max(0, now - clock.since);
  return Math.max(0, clock.remainingMs - ran);
}

export const pause = (clock: Clock, now: number): Clock => ({ remainingMs: remaining(clock, now), since: null });
export const resume = (clock: Clock, now: number): Clock => (clock.since === null ? { ...clock, since: now } : clock);
export const expired = (clock: Clock, now: number): boolean => remaining(clock, now) === 0;

export function format(ms: number): string {
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
