/**
 * The pure half of the diagram screens: where the arrow keys go, and how a
 * labelling attempt is scored. No React, no Dexie, so it is tested in node.
 */

/** The next part index for a key, or `null` when the key is not navigation. Wraps. */
export function nextIndex(count: number, current: number, key: string): number | null {
  if (count === 0) return null;
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (current + 1) % count;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}

export interface LabelScore {
  correct: string[];
  wrong: string[];
  missing: string[];
  /** Every part has a label on it. Checking is only offered then. */
  complete: boolean;
}

/** Scores label placements (`partId → label`) against the parts' real labels. */
export function scoreLabels(
  parts: ReadonlyArray<{ id: string; label: string }>,
  placements: Readonly<Record<string, string | undefined>>,
): LabelScore {
  const score: LabelScore = { correct: [], wrong: [], missing: [], complete: false };
  for (const part of parts) {
    const placed = placements[part.id];
    if (placed === undefined) score.missing.push(part.id);
    else if (placed === part.label) score.correct.push(part.id);
    else score.wrong.push(part.id);
  }
  score.complete = score.missing.length === 0;
  return score;
}

/**
 * Places a label on a part. A label lives on one part at a time, so placing it
 * somewhere new lifts it off wherever it was, like moving a sticker.
 */
export function place(
  placements: Readonly<Record<string, string | undefined>>,
  partId: string,
  label: string,
): Record<string, string | undefined> {
  const next: Record<string, string | undefined> = {};
  for (const [id, value] of Object.entries(placements)) {
    if (value !== label && value !== undefined) next[id] = value;
  }
  next[partId] = label;
  return next;
}
