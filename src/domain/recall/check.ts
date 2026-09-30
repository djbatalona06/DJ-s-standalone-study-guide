import type { Grade } from '../srs/srs';

/**
 * Typed recall: did what you typed cover the answer on the card?
 *
 * Card answers are mostly sentences, so exact matching would mark good answers
 * wrong. This counts the answer's key words found in what was typed. It only
 * ever *suggests* a grade; the learner still presses it, so a matcher cannot
 * mark somebody wrong.
 */
export type Verdict = 'correct' | 'close' | 'wrong';

export interface Checked {
  verdict: Verdict;
  /** Key words of the answer that were found, and ones that were not (as written on the card). */
  matched: string[];
  missing: string[];
}

const FILLER = new Set(
  'a an the of to is are was were be been and or in on for it its that this with as by so you your can at from'.split(' '),
);

/** Lowercase, plain letters, punctuation as a space ("TCP/IP" is "tcp ip", "2ⁿ" is "2n"). */
function words(text: string): string[] {
  return text
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

// ponytail: crude suffix stripping, enough for plurals and -ed/-ing; swap in a real stemmer if misses show up.
function stem(word: string): string {
  if (word.length <= 4) return word;
  return word.replace(/(ing|ed|es|s)$/, '');
}

export function significantWords(text: string): Array<{ word: string; stem: string }> {
  const seen = new Set<string>();
  const out: Array<{ word: string; stem: string }> = [];
  for (const word of words(text)) {
    if (FILLER.has(word)) continue;
    const s = stem(word);
    if (seen.has(s)) continue;
    seen.add(s);
    out.push({ word, stem: s });
  }
  return out;
}

/** Edit distance, stopping early once it is certainly above `max`. */
function within(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[b.length] <= max;
}

const SHORT = 3;

export function checkTyped(input: string, answer: string): Checked {
  const key = significantWords(answer);
  const typed = words(input).map(stem);
  const found = (s: string) => typed.some((t) => t === s || (s.length >= 5 && within(t, s, 1)));
  const matched = key.filter((k) => found(k.stem)).map((k) => k.word);
  const missing = key.filter((k) => !found(k.stem)).map((k) => k.word);
  const ratio = key.length ? matched.length / key.length : 0;

  let verdict: Verdict;
  if (key.length <= SHORT) {
    // Short answers are names and numbers: all of it, or the same characters with one slip.
    const compactTyped = words(input).join('');
    const compactKey = words(answer).join('');
    const same = compactTyped === compactKey || (compactKey.length >= 5 && compactTyped !== '' && within(compactTyped, compactKey, 1));
    verdict = same || ratio === 1 ? 'correct' : ratio >= 0.5 ? 'close' : 'wrong';
  } else {
    verdict = ratio >= 0.5 ? 'correct' : ratio >= 0.25 ? 'close' : 'wrong';
  }
  return { verdict, matched, missing };
}

export function suggestedGrade(verdict: Verdict): Grade {
  return verdict === 'correct' ? 'good' : verdict === 'close' ? 'hard' : 'again';
}
