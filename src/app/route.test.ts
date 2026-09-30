import { describe, expect, it } from 'vitest';
import { href, parseRoute, type Route } from './route';

describe('parseRoute', () => {
  it.each([
    ['', { name: 'today' }],
    ['#/', { name: 'today' }],
    ['#/learn', { name: 'learn' }],
    ['#/me', { name: 'me' }],
    ['#/welcome', { name: 'welcome' }],
    ['#/review/a1', { name: 'review', track: 'a1' }],
    ['#/diagram/motherboard', { name: 'diagram', id: 'motherboard' }],
  ] as Array<[string, Route]>)('%s', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('sends unknown or malformed routes somewhere safe', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'today' });
    expect(parseRoute('#/review/zz')).toEqual({ name: 'today' });
    expect(parseRoute('#/diagram')).toEqual({ name: 'learn' });
  });

  it('round-trips through href', () => {
    const routes: Route[] = [
      { name: 'today' }, { name: 'learn' }, { name: 'me' }, { name: 'welcome' },
      { name: 'review', track: 'cs50' }, { name: 'diagram', id: 'motherboard' },
    ];
    for (const route of routes) expect(parseRoute(href(route))).toEqual(route);
  });
});
