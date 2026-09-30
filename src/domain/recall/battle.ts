import { random, shuffled } from '../flashcards';
import { significantWords } from './check';

/**
 * Typing battle: you and a bot answer the same cards. Pure and seedable, so a
 * battle can be replayed in a test. Every answer still schedules its card, so a
 * battle is a real review, not a separate game.
 */
export interface BotLevel {
  id: 'rookie' | 'regular' | 'veteran';
  label: string;
  /** Chance the bot gets a card right. */
  accuracy: number;
  /** How long it "types" per key word of the answer, when the round is a race. */
  msPerWord: number;
}

export const BOT_LEVELS: readonly BotLevel[] = [
  { id: 'rookie', label: 'Rookie', accuracy: 0.5, msPerWord: 3000 },
  { id: 'regular', label: 'Regular', accuracy: 0.65, msPerWord: 2200 },
  { id: 'veteran', label: 'Veteran', accuracy: 0.8, msPerWord: 1500 },
];

export const ROUNDS = 7;
/** Long sentence answers are not a fair typing contest, so only short ones battle. At 6 a track had only 12 to 19 cards, at 8 it has 22 to 44. */
export const MAX_ANSWER_WORDS = 8;

export function battleEligible(answer: string): boolean {
  return significantWords(answer).length <= MAX_ANSWER_WORDS;
}

export function pickBattleCards<T extends { back: string }>(cards: readonly T[], seed: number, rounds = ROUNDS): T[] {
  return shuffled(cards.filter((card) => battleEligible(card.back)), seed).slice(0, rounds);
}

export interface BotAnswer {
  correct: boolean;
  ms: number;
}

/** One bot answer. `next` is a seeded random source (see `random`). */
export function botAnswer(next: () => number, level: BotLevel, answer: string): BotAnswer {
  const words = Math.max(1, significantWords(answer).length);
  return { correct: next() < level.accuracy, ms: Math.round(words * level.msPerWord * (0.7 + 0.6 * next())) };
}

export type Point = 'you' | 'bot' | 'none';

/**
 * Who scores. Only a correct answer scores. When both are right, a race goes to
 * the faster one and a no-timer round scores nobody, so the quiet mode is
 * never lost on speed.
 */
export function pointFor(youCorrect: boolean, bot: BotAnswer, youMs: number, race: boolean): Point {
  if (youCorrect && !bot.correct) return 'you';
  if (!youCorrect && bot.correct) return 'bot';
  if (youCorrect && bot.correct && race) return youMs <= bot.ms ? 'you' : 'bot';
  return 'none';
}

export function winner(you: number, bot: number): 'you' | 'bot' | 'draw' {
  return you > bot ? 'you' : bot > you ? 'bot' : 'draw';
}

export { random };
