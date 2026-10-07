import { describe, expect, it } from 'vitest';
import { DOMAINS } from '../../content';
import { CARDS, cardsOfTrack } from '../../content/library';
import {
  MAX_TARGET_CHARS,
  RELAXED_FACTOR,
  ROUND_CAP_MS,
  ROUNDS_PER_STAGE,
  STAGES,
  WINS_TO_CLEAR,
  cpuChars,
  cpuFinishMs,
  highestOpen,
  pickTypingRounds,
  planCpu,
  progress,
  random,
  roundPoint,
  stageCleared,
  typingTarget,
  wpm,
} from './typing';

describe('typingTarget', () => {
  it('takes the first sentence, without its full stop', () => {
    expect(typingTarget('Solid state drive.')).toBe('Solid state drive');
    expect(typingTarget('LGA: the pins are in the socket. PGA: the pins are on the CPU.')).toBe('LGA: the pins are in the socket');
    expect(typingTarget('11.')).toBe('11');
  });
  it('refuses what is too long or cannot be typed', () => {
    expect(typingTarget('x'.repeat(MAX_TARGET_CHARS + 1))).toBeNull();
    expect(typingTarget('2ⁿ.')).toBeNull();
    expect(typingTarget('7')).toBeNull();
    expect(typingTarget('')).toBeNull();
  });
  it('collapses stray whitespace so the target can be typed as shown', () => {
    expect(typingTarget('  one   two\nthree ')).toBe('one two three');
  });
});

describe('progress', () => {
  it('counts the matching prefix and flags a slip', () => {
    expect(progress('', 'cat')).toEqual({ correct: 0, wrong: false, done: false });
    expect(progress('ca', 'cat')).toEqual({ correct: 2, wrong: false, done: false });
    expect(progress('cx', 'cat')).toEqual({ correct: 1, wrong: true, done: false });
    expect(progress('cat', 'cat')).toEqual({ correct: 3, wrong: false, done: true });
  });
  it('is finished only on the exact text: extra characters are a slip', () => {
    expect(progress('cats', 'cat')).toEqual({ correct: 3, wrong: true, done: false });
  });
  it('ignores case and curly punctuation, which a phone chooses for you', () => {
    expect(progress('tcp/ip', 'TCP/IP').done).toBe(true);
    expect(progress("it's", 'it’s').done).toBe(true);
    expect(progress('a - b', 'a – b').done).toBe(true);
  });
});

describe('wpm', () => {
  it('is five characters a word', () => {
    expect(wpm(50, 60_000)).toBe(10);
    expect(wpm(100, 30_000)).toBe(40);
    expect(wpm(10, 0)).toBe(0);
  });
});

describe('the CPU', () => {
  const copy = STAGES[0];
  const recall = STAGES[3];

  it('is repeatable for a seed', () => {
    expect(planCpu(random(9), copy)).toEqual(planCpu(random(9), copy));
    expect(planCpu(random(9), copy)).not.toEqual(planCpu(random(10), copy));
  });

  it('types more as time passes and never past the end', () => {
    const plan = planCpu(random(1), copy);
    let last = -1;
    for (let t = 0; t < 60_000; t += 500) {
      const n = cpuChars(plan, t, 20);
      expect(n).toBeGreaterThanOrEqual(last);
      expect(n).toBeLessThanOrEqual(20);
      last = n;
    }
    expect(cpuChars(plan, 0, 20)).toBe(0);
    expect(cpuChars(plan, cpuFinishMs(plan, 20), 20)).toBe(20);
  });

  it('a stage types close to its stated speed', () => {
    for (const stage of STAGES) {
      const n = 3000;
      const next = random(stage.n);
      let total = 0;
      for (let i = 0; i < n; i++) total += planCpu(next, stage).msPerChar;
      const measured = wpm(1, total / n);
      expect(Math.abs(measured - stage.wpm)).toBeLessThanOrEqual(Math.ceil(stage.wpm * 0.08));
    }
  });

  it('later stages are faster to start and to type', () => {
    const finish = (stage: (typeof STAGES)[number]) => {
      const next = random(5);
      let sum = 0;
      for (let i = 0; i < 500; i++) sum += cpuFinishMs(planCpu(next, { ...stage, blank: 0 }), 30);
      return sum / 500;
    };
    expect(finish(STAGES[0])).toBeGreaterThan(finish(STAGES[1]));
    expect(finish(STAGES[1])).toBeGreaterThan(finish(STAGES[2]));
    expect(finish(STAGES[4])).toBeGreaterThan(finish(STAGES[5]));
  });

  it('the relaxed race is slower by the stated factor', () => {
    const a = planCpu(random(3), copy);
    const b = planCpu(random(3), copy, true);
    expect(b.msPerChar / a.msPerChar).toBeCloseTo(RELAXED_FACTOR, 5);
    expect(b.startMs).toBeGreaterThan(a.startMs);
  });

  it('only a recall stage ever blanks, and a blank never finishes or gets past 60%', () => {
    const next = random(11);
    for (let i = 0; i < 400; i++) expect(planCpu(next, copy).blanks).toBe(false);
    const blanked = [...Array(400)].map(() => planCpu(next, recall)).filter((p) => p.blanks);
    expect(blanked.length).toBeGreaterThan(40);
    for (const plan of blanked) {
      expect(cpuFinishMs(plan, 30)).toBe(Infinity);
      expect(cpuChars(plan, 10_000_000, 30)).toBeLessThanOrEqual(18);
    }
  });
});

describe('roundPoint', () => {
  it('goes to whoever finishes first, a tie to you', () => {
    expect(roundPoint(4000, 5000)).toBe('you');
    expect(roundPoint(5000, 5000)).toBe('you');
    expect(roundPoint(6000, 5000)).toBe('cpu');
  });
  it('a wrong or missing answer loses to a CPU that finishes, and scores nobody if it blanked', () => {
    expect(roundPoint(null, 5000)).toBe('cpu');
    expect(roundPoint(null, Infinity)).toBe('none');
    expect(roundPoint(9000, Infinity)).toBe('you');
  });
  it('treats anyone past the cap as not having finished', () => {
    expect(roundPoint(ROUND_CAP_MS + 1, Infinity)).toBe('none');
    expect(roundPoint(ROUND_CAP_MS + 1, ROUND_CAP_MS - 1)).toBe('cpu');
    expect(roundPoint(ROUND_CAP_MS - 1, ROUND_CAP_MS + 1)).toBe('you');
    expect(roundPoint(null, ROUND_CAP_MS + 1)).toBe('none');
  });
});

describe('stages', () => {
  it('are numbered in order, get faster, and open up one at a time', () => {
    STAGES.forEach((stage, i) => expect(stage.n).toBe(i + 1));
    expect(STAGES.filter((s) => s.mode === 'copy').length).toBeGreaterThan(0);
    expect(STAGES.filter((s) => s.mode === 'recall').length).toBeGreaterThan(0);
    expect(highestOpen([])).toBe(1);
    expect(highestOpen([1])).toBe(2);
    expect(highestOpen([1, 2, 3])).toBe(4);
    expect(highestOpen([2, 3])).toBe(1);
    expect(highestOpen([1, 2, 3, 4, 5, 6])).toBe(STAGES.length);
  });
  it('are cleared by winning more than half the rounds', () => {
    expect(WINS_TO_CLEAR).toBe(3);
    expect(stageCleared(WINS_TO_CLEAR - 1)).toBe(false);
    expect(stageCleared(WINS_TO_CLEAR)).toBe(true);
  });
});

describe('pickTypingRounds', () => {
  const cards = [...Array(40)].map((_, i) => ({ id: `c${i}`, back: i % 2 ? `Short answer ${i}.` : 'a long answer '.repeat(10) }));
  it('is repeatable, picks only raceable cards, and pairs each with its target', () => {
    const a = pickTypingRounds(cards, 7);
    expect(a).toEqual(pickTypingRounds(cards, 7));
    expect(a).toHaveLength(ROUNDS_PER_STAGE);
    for (const round of a) expect(round.target).toBe(typingTarget(round.card.back));
  });
  it('differs between seeds and gives up quietly when the pool is thin', () => {
    expect(pickTypingRounds(cards, 1)).not.toEqual(pickTypingRounds(cards, 2));
    expect(pickTypingRounds(cards.slice(0, 4), 1)).toHaveLength(2);
  });
});

describe('the real content', () => {
  const raceable = (cards: typeof CARDS) => cards.filter((c) => typingTarget(c.back) !== null);

  it('has a real pool in every track, so any stage can be played', () => {
    for (const track of ['cs50', 'a1', 'a2'] as const) expect(raceable(cardsOfTrack(track)).length).toBeGreaterThanOrEqual(80);
  });
  it('leaves no domain without cards to race, which is what a thin deck did before', () => {
    for (const domain of DOMAINS) {
      const n = raceable(CARDS.filter((c) => c.domainId === domain.id)).length;
      expect(n, `${domain.id} has ${n} raceable cards`).toBeGreaterThanOrEqual(10);
    }
  });
  it('no raceable card gives its own answer away in its hint', () => {
    const leaks = raceable(CARDS)
      .filter((card) => card.hint.toLowerCase().includes(typingTarget(card.back)!.toLowerCase()))
      .map((card) => card.id);
    expect(leaks).toEqual([]);
  });
});
