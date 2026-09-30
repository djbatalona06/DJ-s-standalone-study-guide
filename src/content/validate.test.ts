import { describe, expect, it } from 'vitest';
import { CARDS, DOMAINS, TRACKS, cardsOfTrack, deckById, domainsOf } from './index';
import { validateContent, validateDiagram } from './validate';
import { DIAGRAMS, DIAGRAM_ART } from './diagrams';
import { CS50_CARDS } from './cs50';
import type { Card } from './types';

describe('the shipped content', () => {
  it('is valid', () => {
    expect(validateContent(TRACKS, DOMAINS, CARDS)).toEqual([]);
  });

  it('has cards in every CS50 week', () => {
    for (const domain of domainsOf('cs50')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(5);
    }
    expect(cardsOfTrack('cs50')).toEqual(CS50_CARDS);
  });

  it('covers every A+ Core 1 domain, written from the objectives as an outline', () => {
    for (const domain of domainsOf('a1')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(10);
    }
    expect(cardsOfTrack('a1').every((c) => c.provenance === 'objective-outline')).toBe(true);
  });

  it('is all original wording: nothing copied from CS50 or an objectives PDF', () => {
    expect(CARDS.every((c) => c.provenance === 'original' || c.provenance === 'objective-outline')).toBe(true);
  });
});

describe('the shipped diagrams', () => {
  it.each(Object.values(DIAGRAMS))('$id is complete, with art for every part', async (diagram) => {
    const art = (await DIAGRAM_ART[diagram.id as keyof typeof DIAGRAM_ART]()).default;
    expect(validateDiagram(diagram, CARDS, art)).toEqual([]);
  });
});

describe('validateDiagram', () => {
  const card: Card = {
    id: 'a1-d3-x', domainId: 'a1-d3', front: 'f', back: 'b', why: 'w', hint: 'h', provenance: 'original',
  };
  const diagram = {
    id: 'd', trackId: 'a1' as const, domainId: 'a1-d3', title: 't', blurb: 'b', textAlternative: 'words',
    parts: [{ id: 'p', label: 'Part', cardId: 'a1-d3-x' }],
  };

  it('accepts a complete diagram', () => {
    expect(validateDiagram(diagram, [card], {
      viewBox: '0 0 100 100', shapes: { p: { x: 0, y: 0, w: 10, h: 10 } }, decor: [], detail: [],
    })).toEqual([]);
  });

  it('catches missing cards, repeats, missing words and stray shapes', () => {
    const problems = validateDiagram(
      {
        ...diagram,
        textAlternative: ' ',
        parts: [...diagram.parts, { id: 'p', label: 'Part', cardId: 'nope' }],
      },
      [card],
      { viewBox: '0 0 100 100', shapes: { p: { x: 95, y: 0, w: 10, h: 10 }, q: { x: 0, y: 0, w: 1, h: 1 } }, decor: [], detail: [] },
    );
    expect(problems).toEqual([
      'diagram d has no text alternative',
      'diagram d repeats part id p',
      'diagram d repeats label Part',
      'part d/p names a missing card nope',
      'part d/p sits outside the 100x100 space',
      'diagram d draws an unknown part q',
    ]);
  });
});

describe('validateContent', () => {
  const good: Card = {
    id: 'cs50-w0-x', domainId: 'cs50-w0', front: 'f', back: 'b', why: 'w', hint: 'h', provenance: 'original',
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

  it('requires a hint on every card, and one that does not give the answer away', () => {
    expect(validateContent(TRACKS, DOMAINS, [{ ...good, hint: ' ' }]).join()).toContain('has no hint');
    const leaky = { ...good, back: 'The CPU socket.', hint: 'Starts with: The CPU socket.' };
    expect(validateContent(TRACKS, DOMAINS, [leaky]).join()).toContain('gives the answer away');
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

describe('deckById', () => {
  const diagrams = Object.values(DIAGRAMS);

  it('finds a track, a domain or a diagram', () => {
    expect(deckById('cs50', diagrams)?.cards).toEqual(CS50_CARDS);
    expect(deckById('a1-d3', diagrams)?.title).toBe('Hardware');
    const board = deckById('motherboard', diagrams);
    expect(board?.cards.map((c) => c.id)).toEqual(DIAGRAMS.motherboard.parts.map((p) => p.cardId));
    expect(board?.trackId).toBe('a1');
  });

  it('is undefined for anything else', () => {
    expect(deckById('nope', diagrams)).toBeUndefined();
  });
});
