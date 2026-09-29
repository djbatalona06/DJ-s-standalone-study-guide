export type DayKey = string;

/** A day is the learner's own calendar day in their timezone, never UTC. */
export function dayKey(at: Date, timeZone: string): DayKey {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function todayKey(timeZone: string, now: number = Date.now()): DayKey {
  return dayKey(new Date(now), timeZone);
}

/** Days are compared and shifted as plain calendar dates, never as instants. */
export function addDays(day: DayKey, delta: number): DayKey {
  const [y, m, d] = day.split('-').map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  at.setUTCDate(at.getUTCDate() + delta);
  return at.toISOString().slice(0, 10);
}

export function daysBetween(from: DayKey, to: DayKey): number {
  const parse = (s: DayKey) => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / 86400000);
}

/** The zone this device is in, falling back to UTC where the browser will not say. */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
