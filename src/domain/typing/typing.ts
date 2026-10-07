import { random, shuffled } from '../flashcards';

/**
 * The typing stage: a real-time race against a CPU, one stage at a time.
 *
 * Everything here is pure and seedable so a whole race can be replayed in a
 * test. The screen only supplies a clock and a keyboard.
 *
 * Two kinds of stage, because typing what you can see and typing what you
 * remember are different skills and only one of them is evidence of recall:
 *
 *  - **copy** stages show the answer. You race to type it exactly. It trains the
 *    spelling and the speed, and counts as exposure, not as a graded review.
 *  - **recall** stages hide the answer. You type it from memory and press Enter;
 *    a right answer is graded Good on the card and a wrong one Again.
 */
export type StageMode = 'copy' | 'recall';

export interface Stage {
  /** 1-based, and the order they unlock in. */
  n: number;
  name: string;
  mode: StageMode;
  /** The CPU's typing speed in words per minute (one word is five characters). */
  wpm: number;
  /** How long it takes to start: reading the prompt, or remembering. */
  thinkMs: number;
  /** Recall stages only: the chance the CPU blanks on a card and never finishes it. */
  blank: number;
}

export const STAGES: readonly Stage[] = [
  { n: 1, name: 'Byte', mode: 'copy', wpm: 18, thinkMs: 900, blank: 0 },
  { n: 2, name: 'Nibble', mode: 'copy', wpm: 26, thinkMs: 700, blank: 0 },
  { n: 3, name: 'Kernel', mode: 'copy', wpm: 34, thinkMs: 600, blank: 0 },
  { n: 4, name: 'Daemon', mode: 'recall', wpm: 30, thinkMs: 3000, blank: 0.25 },
  { n: 5, name: 'Root', mode: 'recall', wpm: 40, thinkMs: 2200, blank: 0.15 },
  { n: 6, name: 'Overclock', mode: 'recall', wpm: 52, thinkMs: 1600, blank: 0.08 },
];

export const ROUNDS_PER_STAGE = 5;
/** Win more than half the rounds to clear a stage. */
export const WINS_TO_CLEAR = Math.floor(ROUNDS_PER_STAGE / 2) + 1;
/** The relaxed race: for anyone who wants the practice without the clock breathing down them. */
export const RELAXED_FACTOR = 1.75;

// ---------------------------------------------------------------- what to type

/** Long sentences are not a fair typing contest; the answer's first sentence is the target. */
export const MAX_TARGET_CHARS = 64;
export const MIN_TARGET_CHARS = 2;
/** Printable ASCII plus the curly punctuation `fold` straightens. Anything else cannot be typed on a phone keyboard. */
const TYPABLE = /^[\x20-\x7E‘’“”–—]+$/;

/** The text to type for a card's answer, or null when the answer has no fair short form. */
export function typingTarget(back: string): string | null {
  const first = back.trim().split(/(?<=[.!?])\s+/)[0] ?? '';
  const text = first.replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim();
  if (text.length < MIN_TARGET_CHARS || text.length > MAX_TARGET_CHARS) return null;
  return TYPABLE.test(text) ? text : null;
}

export interface TypingRound<T> {
  card: T;
  target: string;
}

/** Cards that can be raced, shuffled by seed, each paired with the text to type. */
export function pickTypingRounds<T extends { id: string; back: string }>(
  cards: readonly T[],
  seed: number,
  rounds = ROUNDS_PER_STAGE,
): Array<TypingRound<T>> {
  const out: Array<TypingRound<T>> = [];
  for (const card of shuffled(cards, seed)) {
    const target = typingTarget(card.back);
    if (target) out.push({ card, target });
    if (out.length === rounds) break;
  }
  return out;
}

// --------------------------------------------------------------- what you typed

const SMART: Record<string, string> = { '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-' };
/** Case and curly punctuation never cost anyone a round; a phone keyboard decides both for you. */
const fold = (char: string) => (SMART[char] ?? char).toLowerCase();

export interface Typed {
  /** Leading characters that match the target. */
  correct: number;
  /** Something typed does not match: backspace to fix it. */
  wrong: boolean;
  /** Exactly the target, nothing more. */
  done: boolean;
}

export function progress(typed: string, target: string): Typed {
  let correct = 0;
  while (correct < typed.length && correct < target.length && fold(typed[correct]) === fold(target[correct])) correct += 1;
  return { correct, wrong: typed.length > correct, done: correct === target.length && typed.length === target.length };
}

/** Words per minute by the standard five-characters-a-word rule. */
export function wpm(chars: number, ms: number): number {
  return ms > 0 ? Math.round((chars / 5) / (ms / 60_000)) : 0;
}

// --------------------------------------------------------------------- the CPU

export interface CpuPlan {
  startMs: number;
  msPerChar: number;
  /** Never finishes this card. */
  blanks: boolean;
}

/** One CPU round. `next` is a seeded random source, so a race can be replayed. */
export function planCpu(next: () => number, stage: Stage, relaxed = false): CpuPlan {
  const slow = relaxed ? RELAXED_FACTOR : 1;
  return {
    startMs: Math.round(stage.thinkMs * (0.7 + 0.6 * next()) * slow),
    msPerChar: (12_000 / stage.wpm) * (0.85 + 0.3 * next()) * slow,
    blanks: stage.mode === 'recall' && next() < stage.blank,
  };
}

/** How much of the target the CPU has typed `elapsedMs` into the round. A blanking CPU stalls partway. */
export function cpuChars(plan: CpuPlan, elapsedMs: number, length: number): number {
  const typed = Math.max(0, Math.floor((elapsedMs - plan.startMs) / plan.msPerChar));
  return plan.blanks ? Math.min(typed, Math.floor(length * 0.6)) : Math.min(typed, length);
}

/** When the CPU finishes, or Infinity if it blanked. */
export function cpuFinishMs(plan: CpuPlan, length: number): number {
  return plan.blanks ? Infinity : plan.startMs + length * plan.msPerChar;
}

// ----------------------------------------------------------------- the verdicts

export type Point = 'you' | 'cpu' | 'none';

/** A round nobody finishes in this long is over, so a blanking CPU cannot hang a recall round. */
export const ROUND_CAP_MS = 60_000;

/**
 * Who takes the round. `youMs` is when you finished it correctly, or null if you
 * did not (wrong answer, or gave up). Anyone past the cap did not finish. A tie
 * goes to you.
 */
export function roundPoint(youMs: number | null, cpuMs: number): Point {
  const you = youMs !== null && youMs <= ROUND_CAP_MS ? youMs : Infinity;
  const cpu = cpuMs <= ROUND_CAP_MS ? cpuMs : Infinity;
  if (you !== Infinity && you <= cpu) return 'you';
  return cpu !== Infinity ? 'cpu' : 'none';
}

export function stageCleared(wins: number): boolean {
  return wins >= WINS_TO_CLEAR;
}

/** The highest stage number a learner may enter, given the stages they have cleared. */
export function highestOpen(cleared: readonly number[]): number {
  let n = 1;
  while (cleared.includes(n) && n < STAGES.length) n += 1;
  return n;
}

export { random };
