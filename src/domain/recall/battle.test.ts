import { describe, expect, it } from 'vitest';
import { CARDS, cardsOfTrack } from '../../content/library';
import { BOT_LEVELS, ROUNDS, battleEligible, botAnswer, pickBattleCards, pointFor, random, winner } from './battle';

describe('battleEligible', () => {
  it('allows short answers and refuses long sentences', () => {
    expect(battleEligible('11.')).toBe(true);
    expect(battleEligible('Solid state drive')).toBe(true);
    expect(battleEligible('A single binary digit: 0 or 1. The smallest unit of information a computer stores.')).toBe(false);
  });
});

describe('pickBattleCards', () => {
  const pool = [...Array(30)].map((_, i) => ({ id: i, back: i % 2 ? 'short' : 'a long answer with many different words that keep going on and on for quite some time yet' }));
  it('is repeatable for a seed and only picks short answers', () => {
    const a = pickBattleCards(pool, 7);
    expect(a).toEqual(pickBattleCards(pool, 7));
    expect(a).toHaveLength(ROUNDS);
    expect(a.every((c) => c.id % 2 === 1)).toBe(true);
  });
  it('differs between seeds', () => {
    expect(pickBattleCards(pool, 1)).not.toEqual(pickBattleCards(pool, 2));
  });
});

describe('botAnswer', () => {
  it.each(BOT_LEVELS)('$label is right about as often as its accuracy', (level) => {
    const next = random(42);
    const n = 4000;
    let right = 0;
    for (let i = 0; i < n; i++) if (botAnswer(next, level, 'solid state drive').correct) right += 1;
    expect(Math.abs(right / n - level.accuracy)).toBeLessThan(0.04);
  });
  it('is slower on longer answers, and the same seed gives the same answer', () => {
    const level = BOT_LEVELS[1];
    expect(botAnswer(random(1), level, 'one two three four five')).toEqual(botAnswer(random(1), level, 'one two three four five'));
    expect(botAnswer(random(1), level, 'one two three four five').ms).toBeGreaterThan(botAnswer(random(1), level, 'one').ms);
  });
});

describe('pointFor', () => {
  const right = { correct: true, ms: 2000 };
  const wrong = { correct: false, ms: 2000 };
  it('only a correct answer scores', () => {
    expect(pointFor(true, wrong, 9000, false)).toBe('you');
    expect(pointFor(false, right, 1, false)).toBe('bot');
    expect(pointFor(false, wrong, 1, true)).toBe('none');
  });
  it('both right: the faster wins a race, nobody scores without one', () => {
    expect(pointFor(true, right, 1500, true)).toBe('you');
    expect(pointFor(true, right, 2500, true)).toBe('bot');
    expect(pointFor(true, right, 1500, false)).toBe('none');
  });
});

describe('winner', () => {
  it('compares scores', () => {
    expect([winner(4, 2), winner(1, 3), winner(2, 2)]).toEqual(['you', 'bot', 'draw']);
  });
});

describe('the card pool', () => {
  it('has enough short answers in every deck to fill a battle', () => {
    for (const track of ['cs50', 'a1', 'a2'] as const) {
      const n = cardsOfTrack(track).filter((c) => battleEligible(c.back)).length;
      console.log(`battle-eligible cards in ${track}: ${n} of ${cardsOfTrack(track).length}`);
      expect(n).toBeGreaterThanOrEqual(ROUNDS * 2);
    }
    expect(CARDS.length).toBeGreaterThan(0);
  });
});
