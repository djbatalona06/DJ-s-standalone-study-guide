import { describe, expect, it } from 'vitest';
import { levelOf, nextActions, stageOf, statuses, unmet, validatePathway, type Mark, type PathNode } from './pathway';

const node = (id: string, extra: Partial<PathNode> = {}): PathNode => ({
  id, stage: 'Foundations', type: 'skill', title: id, summary: 's', hours: 10, requires: [], ...extra,
});

// A small path with one node in every stage, so the whole ladder validates.
const ladder: PathNode[] = [
  node('a'),
  node('b', { stage: 'Help desk', type: 'role', requires: ['a'], grants: 'Help desk' }),
  node('c', { stage: 'Specialize', type: 'cert', requires: ['b'], grants: 'Specialize' }),
  node('d', { stage: 'Sysadmin', type: 'role', requires: ['b', 'c'], grants: 'Sysadmin' }),
  node('e', { stage: 'Cloud', type: 'role', requires: ['d'], grants: 'Cloud' }),
];
const marks = (entries: Array<[string, Mark]>) => new Map(entries);

describe('validatePathway', () => {
  it('accepts a sound path', () => {
    expect(validatePathway(ladder)).toEqual([]);
  });

  it('catches duplicates, missing and self requirements, bad slugs, and empty stages', () => {
    const problems = validatePathway([node('a'), node('a'), node('B x', { requires: ['nope', 'B x'] })]);
    expect(problems).toContain('duplicate node id: a');
    expect(problems).toContain('node B x is not a stable slug');
    expect(problems).toContain('node B x requires a missing node nope');
    expect(problems).toContain('node B x requires itself');
    expect(problems.some((p) => p.startsWith('stage Cloud has no nodes'))).toBe(true);
  });

  it('catches a cycle, which would lock every node in it forever', () => {
    const cyc = [...ladder.slice(0, 1), node('x', { requires: ['y'] }), node('y', { requires: ['x'] })];
    expect(validatePathway(cyc).join()).toMatch(/cycle: (x -> y -> x|y -> x -> y)/);
  });

  it('catches a requirement from a later stage', () => {
    const bad = ladder.map((n) => (n.id === 'a' ? { ...n, requires: ['e'] } : n));
    expect(validatePathway(bad).join()).toContain('requires e, which is in a later stage');
  });

  it('refuses a pay figure with no source or no date, and accepts one with both', () => {
    const pay = { median: 60000, dataYear: 'May 2025', source: 'https://example.gov/x', sourceName: 'A Bureau', retrievedOn: '2026-09-30' };
    const withPay = (p: object) => ladder.map((n) => (n.id === 'b' ? { ...n, pay: p as PathNode['pay'] } : n));
    expect(validatePathway(withPay(pay))).toEqual([]);
    expect(validatePathway(withPay({ ...pay, source: '' })).join()).toContain('no source');
    expect(validatePathway(withPay({ ...pay, source: 'http://example.gov' })).join()).toContain('no source');
    expect(validatePathway(withPay({ ...pay, retrievedOn: 'yesterday' })).join()).toContain('no retrieval date');
    expect(validatePathway(withPay({ ...pay, median: 0 })).join()).toContain('without an amount');
  });

  it('only roles and certs can grant a stage', () => {
    const bad = ladder.map((n) => (n.id === 'a' ? { ...n, grants: 'Cloud' as const } : n));
    expect(validatePathway(bad).join()).toContain('grants a stage but is not a role or cert');
  });
});

describe('statuses', () => {
  it('opens a node only when every prerequisite is done', () => {
    const s = statuses(ladder, marks([['a', 'done']]));
    expect(s.get('a')).toBe('done');
    expect(s.get('b')).toBe('available');
    expect(s.get('c')).toBe('locked');
    const both = statuses(ladder, marks([['a', 'done'], ['b', 'done']]));
    expect(both.get('c')).toBe('available');
    expect(both.get('d')).toBe('locked'); // needs c too
  });

  it('shows what was started, and keeps it when a prerequisite is later reopened', () => {
    expect(statuses(ladder, marks([['a', 'started']])).get('a')).toBe('in-progress');
    expect(statuses(ladder, marks([['b', 'started']])).get('b')).toBe('in-progress');
  });

  it('lists what is missing', () => {
    expect(unmet(ladder[3], marks([['b', 'done']]))).toEqual(['c']);
    expect(unmet(ladder[0], marks([]))).toEqual([]);
  });
});

describe('nextActions', () => {
  it('puts work in progress first, then open nodes, in path order', () => {
    const s = statuses(ladder, marks([['a', 'done'], ['b', 'started']]));
    expect(nextActions(ladder, s).map((n) => n.id)).toEqual(['b']);
    const open = statuses([...ladder, node('z', { stage: 'Foundations' })], marks([]));
    expect(nextActions([...ladder, node('z')], open).map((n) => n.id)).toEqual(['a', 'z']);
  });

  it('respects the limit and is empty when everything is done or locked', () => {
    const all = ladder.map((n): [string, Mark] => [n.id, 'done']);
    expect(nextActions(ladder, statuses(ladder, marks(all)))).toEqual([]);
    const many = Array.from({ length: 6 }, (_, i) => node(`n${i}`));
    expect(nextActions(many, statuses(many, marks([])), 2)).toHaveLength(2);
  });
});

describe('stageOf', () => {
  it('follows the furthest done node that grants a stage', () => {
    expect(stageOf(ladder, statuses(ladder, marks([])))).toBe('Foundations');
    expect(stageOf(ladder, statuses(ladder, marks([['a', 'done'], ['b', 'done']])))).toBe('Help desk');
    expect(stageOf(ladder, statuses(ladder, marks([['a', 'done'], ['b', 'started']])))).toBe('Foundations');
    expect(stageOf(ladder, statuses(ladder, marks([['e', 'done']])))).toBe('Cloud');
  });

  it('numbers stages from one', () => {
    expect(levelOf('Foundations')).toBe(1);
    expect(levelOf('Cloud')).toBe(5);
  });
});

describe('the shipped pathway', () => {
  it('is valid, and links only to tracks and certifier pages', async () => {
    const { PATHWAY } = await import('../../content/pathway');
    const { TRACKS } = await import('../../content');
    expect(validatePathway(PATHWAY)).toEqual([]);
    for (const node of PATHWAY) {
      if (node.trackId) expect(TRACKS.map((t) => t.id)).toContain(node.trackId);
    }
  });

  it('shows pay only where it is sourced, and never invents a figure for the cloud role', async () => {
    const { PATHWAY } = await import('../../content/pathway');
    const paid = PATHWAY.filter((n) => n.pay).map((n) => n.id);
    expect(paid).toEqual(['role-help-desk', 'role-sysadmin']);
    expect(PATHWAY.find((n) => n.id === 'role-cloud')?.pay).toBeUndefined();
  });

  it('starts everyone at the same open nodes, and reaches a cloud role only through the whole ladder', async () => {
    const { PATHWAY } = await import('../../content/pathway');
    const start = statuses(PATHWAY, new Map());
    expect(PATHWAY.filter((n) => start.get(n.id) === 'available').map((n) => n.id)).toEqual(['cs50-intro', 'aplus-core1', 'aplus-core2', 'home-lab']);
    expect(start.get('role-cloud')).toBe('locked');
    const everythingElse = new Map<string, Mark>(PATHWAY.filter((n) => n.id !== 'role-cloud').map((n) => [n.id, 'done']));
    expect(statuses(PATHWAY, everythingElse).get('role-cloud')).toBe('available');
    expect(stageOf(PATHWAY, statuses(PATHWAY, everythingElse))).toBe('Sysadmin');
  });
});
