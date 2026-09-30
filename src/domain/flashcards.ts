/**
 * The pure half of Flashcards mode: a repeatable shuffle and bounded steps.
 * Browsing is not grading, so nothing here touches the scheduler.
 */

/** A small seeded generator (mulberry32), so a shuffle can be tested and repeated. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates with a seed. Returns a new array; the input is untouched. */
export function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  const next = random(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Moves through a deck. Stepping past the last card lands on `count`, the
 * "you went through them all" screen; stepping back never goes below 0.
 */
export function step(index: number, count: number, delta: -1 | 1): number {
  return Math.max(0, Math.min(count, index + delta));
}
