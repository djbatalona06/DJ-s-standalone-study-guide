import { describe, expect, it } from 'vitest';
import { href, parseRoute, type Route } from './route';

describe('parseRoute', () => {
  it.each([
    ['', { name: 'today' }],
    ['#/', { name: 'today' }],
    ['#/learn', { name: 'learn' }],
    ['#/me', { name: 'me' }],
    ['#/welcome', { name: 'welcome' }],
    ['#/path', { name: 'path' }],
    ['#/path/role-help-desk', { name: 'node', id: 'role-help-desk' }],
    ['#/review/a1', { name: 'review', track: 'a1' }],
    ['#/quiz/a1-d3', { name: 'quiz', scope: 'a1-d3' }],
    ['#/exam/a1', { name: 'exam', track: 'a1' }],
    ['#/diagram/motherboard', { name: 'diagram', id: 'motherboard' }],
    ['#/flashcards/a1-d3', { name: 'flashcards', deck: 'a1-d3' }],
  ] as Array<[string, Route]>)('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('sends unknown or malformed routes somewhere safe', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'today' });
    expect(parseRoute('#/review/zz')).toEqual({ name: 'today' });
    expect(parseRoute('#/diagram')).toEqual({ name: 'learn' });
    expect(parseRoute('#/quiz')).toEqual({ name: 'learn' });
    expect(parseRoute('#/exam/zz')).toEqual({ name: 'learn' });
    expect(parseRoute('#/flashcards')).toEqual({ name: 'learn' });
  });

  it('round-trips through href', () => {
    const routes: Route[] = [
      { name: 'today' }, { name: 'learn' }, { name: 'me' }, { name: 'welcome' }, { name: 'path' }, { name: 'node', id: 'aplus-core1' },
      { name: 'review', track: 'cs50' }, { name: 'quiz', scope: 'a1' }, { name: 'exam', track: 'a2' }, { name: 'diagram', id: 'motherboard' },
      { name: 'flashcards', deck: 'motherboard' },
    ];
    for (const route of routes) expect(parseRoute(href(route))).toEqual(route);
  });
});
