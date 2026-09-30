import { describe, expect, it } from 'vitest';
import { checkTyped, significantWords, suggestedGrade } from './check';

describe('checkTyped: short answers', () => {
  it('accepts the exact answer, ignoring case, punctuation and spacing', () => {
    expect(checkTyped('  11 ', '11.').verdict).toBe('correct');
    expect(checkTyped('tcp/ip', 'TCP/IP').verdict).toBe('correct');
    expect(checkTyped('tcp ip', 'TCP/IP').verdict).toBe('correct');
  });
  it('reads a superscript as the plain character', () => {
    expect(checkTyped('2n', '2ⁿ.').verdict).toBe('correct');
  });
  it('forgives one typo when the answer is five or more characters', () => {
    expect(checkTyped('algoritm', 'Algorithm').verdict).toBe('correct');
    expect(checkTyped('12', '11.').verdict).toBe('wrong');
  });
  it('is only close when part of a short answer is right', () => {
    expect(checkTyped('solid drive', 'solid state drive').verdict).toBe('close');
    expect(checkTyped('keyboard', 'solid state drive').verdict).toBe('wrong');
  });
});

describe('checkTyped: sentence answers', () => {
  const answer = 'A single binary digit: 0 or 1. The smallest unit of information a computer stores.';
  it('is correct when most of the key words are there, in any order', () => {
    expect(checkTyped('the smallest unit of information, a binary digit', answer).verdict).toBe('correct');
  });
  it('is close with a quarter to a half of them', () => {
    expect(checkTyped('a binary digit in a computer', answer).verdict).toBe('close');
  });
  it('is wrong with almost none, and says what was missed', () => {
    const result = checkTyped('a kind of fruit', answer);
    expect(result.verdict).toBe('wrong');
    expect(result.missing).toContain('binary');
  });
  it('treats an empty answer as wrong', () => {
    expect(checkTyped('', answer).verdict).toBe('wrong');
    expect(checkTyped('   ', answer).matched).toEqual([]);
  });
  it('matches simple plurals and endings', () => {
    expect(checkTyped('it stores information', 'Stored information').verdict).toBe('correct');
  });
});

describe('significantWords', () => {
  it('drops filler words but keeps numbers', () => {
    expect(significantWords('It is the 2 of them').map((w) => w.word)).toEqual(['2', 'them']);
  });
});

describe('suggestedGrade', () => {
  it('maps a verdict to a grade the learner can still change', () => {
    expect([suggestedGrade('correct'), suggestedGrade('close'), suggestedGrade('wrong')]).toEqual(['good', 'hard', 'again']);
  });
});
