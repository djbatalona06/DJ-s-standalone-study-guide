import { describe, expect, it } from 'vitest';
import { DOMAINS, TRACKS, domainsOf } from './index';
import { CARDS, cardsOfTrack, deckById } from './library';
import { validateContent, validateDiagram, validateQuestions } from './validate';
import { TRACKS_WITH_QUESTIONS, loadBank } from './questions';
import type { Question } from './types';
import { DIAGRAMS, DIAGRAM_ART, type Diagram, type DiagramArt } from './diagrams';
import { CS50_CARDS } from './cs50';
import { SHORT_CS50_CARDS } from './short-cs50';
import type { Card } from './types';

describe('the shipped content', () => {
  it('is valid', () => {
    expect(validateContent(TRACKS, DOMAINS, CARDS)).toEqual([]);
  });

  it('has cards in every CS50 week', () => {
    for (const domain of domainsOf('cs50')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(5);
    }
    expect(cardsOfTrack('cs50')).toEqual([...CS50_CARDS, ...SHORT_CS50_CARDS]);
  });

  it('covers every A+ Core 1 domain, written from the objectives as an outline', () => {
    for (const domain of domainsOf('a1')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(10);
    }
    expect(cardsOfTrack('a1').every((c) => c.provenance === 'objective-outline')).toBe(true);
  });

  it('covers every A+ Core 2 domain, written from the objectives as an outline', () => {
    for (const domain of domainsOf('a2')) {
      expect(CARDS.filter((c) => c.domainId === domain.id).length).toBeGreaterThanOrEqual(10);
    }
    expect(cardsOfTrack('a2').every((c) => c.provenance === 'objective-outline')).toBe(true);
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

  it('catches parts that overlap, which would make one untappable', () => {
    const d: Diagram = { ...diagram, parts: [
      { id: 'a', label: 'A', cardId: 'a1-d3-x' }, { id: 'b', label: 'B', cardId: 'a1-d3-x' },
    ] };
    const overlapping: DiagramArt = { viewBox: '0 0 100 100', decor: [], detail: [], shapes: { a: { x: 0, y: 0, w: 10, h: 10 }, b: { x: 5, y: 5, w: 10, h: 10 } } };
    const touching: DiagramArt = { ...overlapping, shapes: { a: { x: 0, y: 0, w: 10, h: 10 }, b: { x: 10, y: 0, w: 10, h: 10 } } };
    expect(validateDiagram(d, [card], overlapping).join()).toContain('overlap');
    expect(validateDiagram(d, [card], touching)).toEqual([]);
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
    expect(deckById('cs50', diagrams)?.cards).toEqual([...CS50_CARDS, ...SHORT_CS50_CARDS]);
    expect(deckById('a1-d3', diagrams)?.title).toBe('Hardware');
    const board = deckById('motherboard', diagrams);
    expect(board?.cards.map((c) => c.id)).toEqual(DIAGRAMS.motherboard.parts.map((p) => p.cardId));
    expect(board?.trackId).toBe('a1');
  });

  it('is undefined for anything else', () => {
    expect(deckById('nope', diagrams)).toBeUndefined();
  });
});

describe('the shipped questions', () => {
  it('are valid, and every track that says it has a bank has one', async () => {
    for (const track of TRACKS) {
      const bank = await loadBank(track.id);
      expect(bank.length > 0).toBe(TRACKS_WITH_QUESTIONS.includes(track.id));
      expect(validateQuestions(DOMAINS, CARDS, bank, Object.values(DIAGRAMS))).toEqual([]);
    }
  });

  it('cover every Core 1 domain with several questions, and use every question type', async () => {
    const bank = await loadBank('a1');
    for (const domain of domainsOf('a1')) {
      expect(bank.filter((q) => q.domainId === domain.id).length).toBeGreaterThanOrEqual(8);
    }
    for (const type of ['mcq', 'multi', 'order', 'match', 'hotspot']) expect(bank.some((q) => q.type === type)).toBe(true);
  });

  it('cover every Core 2 domain, in roughly the proportion of the exam', async () => {
    const bank = await loadBank('a2');
    for (const domain of domainsOf('a2')) {
      expect(bank.filter((q) => q.domainId === domain.id).length).toBeGreaterThanOrEqual(15);
    }
    for (const type of ['mcq', 'multi', 'order', 'match']) expect(bank.some((q) => q.type === type)).toBe(true);
  });

  it('never repeat an id across banks', async () => {
    const ids = (await Promise.all(TRACKS.map((t) => loadBank(t.id)))).flat().map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('validateQuestions', () => {
  const ok: Question = {
    id: 'q-a1-d1-x', domainId: 'a1-d1', type: 'mcq', prompt: 'p', choices: ['a', 'b'], answer: 0,
    explanation: 'why', provenance: 'original',
  };
  const check = (q: Question) => validateQuestions(DOMAINS, CARDS, [q]);

  it('accepts a good question', () => {
    expect(check(ok)).toEqual([]);
  });

  it('catches an answer key that points nowhere, repeated choices, blanks and orphans', () => {
    expect(check({ ...ok, answer: 5 }).join()).toContain('outside its choices');
    expect(check({ ...ok, choices: ['a', 'a'] }).join()).toContain('repeated choices');
    expect(check({ ...ok, explanation: ' ' }).join()).toContain('no explanation');
    expect(check({ ...ok, domainId: 'nope' }).join()).toContain('unknown domain');
    expect(check({ ...ok, cardId: 'missing' }).join()).toContain('missing card');
    expect(validateQuestions(DOMAINS, CARDS, [ok, ok]).join()).toContain('duplicate question id');
  });

  it('checks a hotspot against its diagram’s parts', () => {
    const hot = { ...ok, type: 'hotspot', diagramId: 'd1', answer: 1 } as unknown as Question;
    const diagrams = [{ id: 'd1', parts: [{ id: 'a', label: 'A', cardId: 'x' }, { id: 'b', label: 'B', cardId: 'x' }] }];
    expect(validateQuestions(DOMAINS, CARDS, [hot], diagrams)).toEqual([]);
    expect(validateQuestions(DOMAINS, CARDS, [{ ...hot, answer: 2 } as Question], diagrams).join()).toContain('outside its diagram');
    expect(validateQuestions(DOMAINS, CARDS, [{ ...hot, diagramId: 'nope' } as Question], diagrams).join()).toContain('missing diagram');
  });

  it('checks each type’s own shape', () => {
    const multi: Question = { ...ok, type: 'multi', choices: ['a', 'b', 'c'], answers: [0, 1] } as Question;
    expect(check(multi)).toEqual([]);
    expect(check({ ...multi, answers: [0, 0] } as Question).join()).toContain('bad answer key');
    expect(check({ ...multi, answers: [0, 1, 2] } as Question).join()).toContain('at least one wrong');
    expect(check({ ...multi, answers: [0] } as Question).join()).toContain('at least two right');
    expect(check({ ...ok, type: 'order', items: ['a', 'b'] } as unknown as Question).join()).toContain('fewer than three');
    const match = { ...ok, type: 'match', pairs: [{ term: 'a', definition: '1' }, { term: 'a', definition: '2' }, { term: 'c', definition: '3' }] };
    expect(check(match as unknown as Question).join()).toContain('repeated terms');
  });
});

describe('question domains', () => {
  it('files each hotspot under the same domain as its diagram', async () => {
    const bank = await loadBank('a1');
    for (const q of bank) {
      if (q.type !== 'hotspot') continue;
      const diagram = DIAGRAMS[q.diagramId as keyof typeof DIAGRAMS];
      expect(q.domainId, q.id).toBe(diagram.domainId);
    }
  });
});
