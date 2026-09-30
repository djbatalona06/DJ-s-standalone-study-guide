import type { FlushSummary } from '../db/repository';
import { MIN_CARDS_FOR_XP } from '../domain/xp/kinds';

/** What happened to a finished session's HeartBeat XP, in one plain line. `reviewed` is cards answered or questions answered. */
export function XpLine({ done, reviewed }: { done: { sent: FlushSummary | null; queued: boolean }; reviewed: number }) {
  if (!done.queued) {
    return (
      <p className="text-muted-foreground">
        {reviewed < MIN_CARDS_FOR_XP
          ? `Sessions of ${MIN_CARDS_FOR_XP} cards or more earn HeartBeat XP.`
          : 'Saved.'}
      </p>
    );
  }
  if (!done.sent || done.sent.attempted === 0) {
    return <p className="text-muted-foreground">Saved. It will go to HeartBeat when you are linked and online.</p>;
  }
  if (done.sent.needsReconnect) {
    return <p>Saved, but the HeartBeat link needs reconnecting in Me.</p>;
  }
  if (done.sent.sent === 0) return <p className="text-muted-foreground">Saved. It will retry when you are back online.</p>;
  return done.sent.xp > 0
    ? <p className="font-pixel text-xs text-(--color-xp)">+{done.sent.xp} XP for the pet</p>
    : <p className="text-muted-foreground">Today’s study XP is maxed for today. Nice work.</p>;
}
