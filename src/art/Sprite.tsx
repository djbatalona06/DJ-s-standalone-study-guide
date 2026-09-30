import { useEffect, useState } from 'react';
import { PALETTE, SPRITES, SPRITE_SIZE, runs, type SpriteKey } from './sprites';

interface Props {
  /** One key is a still; several play in a loop, unless motion is reduced. */
  frames: SpriteKey[];
  label: string;
  size?: number;
  className?: string;
}

const FRAME_MS = 480;

export function Sprite({ frames, label, size = 96, className }: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), FRAME_MS);
    return () => window.clearInterval(timer);
  }, [frames.length]);

  const sprite = SPRITES[frames[frame % frames.length]];
  return (
    <svg
      className={`sprite ${className ?? ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${SPRITE_SIZE} ${SPRITE_SIZE}`}
      role="img"
      aria-label={label}
    >
      {runs(sprite).map((run) => (
        <rect key={`${run.x}-${run.y}`} x={run.x} y={run.y} width={run.width} height={1} fill={PALETTE[run.key]} />
      ))}
    </svg>
  );
}
