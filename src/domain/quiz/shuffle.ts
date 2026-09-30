/**
 * A seeded shuffle, so a question looks the same when an exam is resumed after a
 * reload, and a test can say exactly what it expects. Not for anything secret.
 */
export function seededRandom(seed: string): () => number {
  // xmur3 turns the string into a 32-bit state; mulberry32 walks it.
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], seed: string): T[] {
  const out = [...items];
  const random = seededRandom(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * A display order for `n` things, as indices. With `avoidIdentity` the answer is
 * never handed over already sorted (an ordering question that starts solved).
 */
export function permutation(n: number, seed: string, avoidIdentity = false): number[] {
  const base = Array.from({ length: n }, (_, i) => i);
  const order = shuffled(base, seed);
  if (avoidIdentity && n > 1 && order.every((v, i) => v === i)) order.push(order.shift()!);
  return order;
}
