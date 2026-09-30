/** The personal rule from the PRD: book only when both numbers clear the bar. Tune it with your own results. */
export const BOOK_AT = 0.85;

export interface BookingAdvice {
  ready: boolean;
  /** One plain sentence, for the screen. */
  message: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** `exams` are practice-exam scores (0–1), newest first. Only the latest two count. */
export function bookingAdvice(readiness: number, exams: readonly number[], bar = BOOK_AT): BookingAdvice {
  const lastTwo = exams.slice(0, 2);
  const examsOk = lastTwo.length === 2 && lastTwo.every((s) => s >= bar);
  const ready = readiness >= bar && examsOk;
  if (ready) return { ready, message: `Your readiness and your last two exams are all ${pct(bar)} or better. Time to book.` };
  const gaps: string[] = [];
  if (readiness < bar) gaps.push(`readiness is ${pct(readiness)}`);
  if (lastTwo.length < 2) gaps.push(lastTwo.length === 0 ? 'no practice exams yet' : 'one practice exam so far');
  else if (!examsOk) gaps.push(`your last two exams were ${lastTwo.map(pct).join(' and ')}`);
  return { ready, message: `Book when readiness and your last two exams reach ${pct(bar)}. Now: ${gaps.join(', ')}.` };
}
