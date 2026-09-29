import { describe, expect, it } from 'vitest';
import { CARDS, DOMAINS, TRACKS, cardsOfTrack, domainsOf } from './index';
import { validateContent } from './validate';
import type { Card } from './types';

describe('the shipped content', () => {
  it('is valid', () => {
    expect(validateContent(TRACKS, DOMAINS, CARDS)).toEqual([]);
  });

  it('has cards in every CS50 week', () => {
    for (const domain of domainsOf('cs50')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(5);
    }
    expect(cardsOfTrack('cs50').length).toBe(CARDS.length);
  });

  it('is all original wording', () => {
    expect(CARDS.every((c) => c.provenance === 'original')).toBe(true);
  });
});

describe('validateContent', () => {
  const good: Card = {
    id: 'cs50-w0-x', domainId: 'cs50-w0', front: 'f', back: 'b', why: 'w', provenance: 'original',
  };

  it('catches duplicates, orphans, blanks and missing provenance', () => {
    const bad: Card[] = [
      good,
      { ...good },
      { ...good, id: 'orphan', domainId: 'nope' },
      { ...good, id: 'blank', back: ' ' },
      { ...good, id: 'no-why', why: '' },
      { ...good, id: 'no-prov', provenance: '' as never },
      { ...good, id: 'Bad Id' },
    ];
    const problems = validateContent(TRACKS, DOMAINS, bad).join('\n');
    expect(problems).toContain('duplicate card id: cs50-w0-x');
    expect(problems).toContain('unknown domain');
    expect(problems).toContain('empty side');
    expect(problems).toContain('no explanation');
    expect(problems).toContain('no provenance');
    expect(problems).toContain('not a stable slug');
  });

  it('requires a source for anything derived from CS50', () => {
    const derived: Card = { ...good, id: 'derived', provenance: 'cs50-derived' };
    expect(validateContent(TRACKS, DOMAINS, [derived]).join()).toContain('names no source');
    expect(validateContent(TRACKS, DOMAINS, [{ ...derived, sourceUrl: 'https://cs50.harvard.edu/x/' }])).toEqual([]);
  });

  it('catches domain weights that do not sum to one', () => {
    const skewed = DOMAINS.map((d) => (d.id === 'a1-d1' ? { ...d, weight: 0.5 } : d));
    expect(validateContent(TRACKS, skewed, []).join()).toContain('a1 domain weights');
  });
});
