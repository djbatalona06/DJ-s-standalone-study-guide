import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Button } from '@/components/ui/8bit/button';
import { Switch } from '@/components/ui/8bit/switch';
import { Panel } from '@/components/Panel';
import { isCalm } from '@/domain/display';
import { ROUNDS_PER_STAGE, STAGES, WINS_TO_CLEAR, highestOpen, typingTarget, type Stage } from '@/domain/typing/typing';
import { typingProgress } from '../../db/repository';
import { TRACKS, type TrackId } from '../../content';
import { Character } from '../Character';
import { useSettings } from '../useApp';
import { useLibrary } from '../useLibrary';
import { XpLine } from '../XpLine';
import { Race, type StageSummary } from './Race';

/** The typing stages of one track: pick a stage, race the CPU, climb. */
export function TypingPage({ trackId, onExit }: { trackId: TrackId; onExit: () => void }) {
  const library = useLibrary();
  const settings = useSettings();
  const rows = useLiveQuery(() => typingProgress(trackId), [trackId]);
  const [stage, setStage] = useState<Stage | null>(null);
  const [run, setRun] = useState(0);
  const [done, setDone] = useState<StageSummary | null>(null);
  const [relaxedChoice, setRelaxedChoice] = useState<boolean | null>(null);

  const pool = useMemo(
    () => (library ? library.cardsOfTrack(trackId).filter((card) => typingTarget(card.back) !== null) : []),
    [library, trackId],
  );
  if (!library || rows === undefined) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  const trackTitle = TRACKS.find((t) => t.id === trackId)?.title ?? trackId;
  const relaxed = relaxedChoice ?? isCalm(settings.calm, window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const byStage = new Map(rows.map((row) => [row.n, row]));
  const open = highestOpen(rows.filter((row) => row.clears > 0).map((row) => row.n));
  const ready = pool.length >= ROUNDS_PER_STAGE * 2;

  function begin(next: Stage) {
    setDone(null);
    setStage(next);
    setRun((n) => n + 1);
  }

  if (stage && !done) {
    return (
      <Race
        key={run}
        trackId={trackId}
        stage={stage}
        relaxed={relaxed}
        pool={pool}
        onDone={setDone}
        onExit={() => setStage(null)}
      />
    );
  }

  if (stage && done) {
    const nextStage = STAGES[stage.n];
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-6 text-center">
        <Character size={112} label={`${settings.characterName || 'Your character'}, typing on a laptop`} />
        <h1 className="font-pixel text-sm leading-relaxed">
          {done.cleared ? `Stage ${stage.n} cleared` : `The ${stage.name} CPU held on`}
        </h1>
        <Panel className="w-full text-left">
          <p className="font-pixel text-2xl">{done.wins} of {done.rounds} rounds</p>
          <p className="text-muted-foreground">
            {done.cleared ? 'You won enough rounds to move up.' : `Win ${WINS_TO_CLEAR} of ${ROUNDS_PER_STAGE} to clear it.`}
            {done.wpm > 0 ? ` You typed at ${done.wpm} WPM.` : ''}
          </p>
          <XpLine done={{ sent: done.sent, queued: done.queued }} reviewed={done.rounds} />
          {done.cleared && nextStage ? (
            <Button className="mt-3 h-12 w-full" onClick={() => begin(nextStage)}>Next: {nextStage.name}</Button>
          ) : null}
          <Button variant={done.cleared && nextStage ? 'secondary' : 'default'} className="mt-3 h-12 w-full" onClick={() => begin(stage)}>
            {done.cleared ? 'Play it again' : 'Try again'}
          </Button>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={() => { setDone(null); setStage(null); }}>All stages</Button>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onExit}>Back to Learn</Button>
        </Panel>
      </section>
    );
  }

  return (
    <section aria-label="Typing stages">
      <h1 className="mb-4 font-pixel text-sm leading-relaxed">Typing stages: {trackTitle}</h1>
      <Panel>
        <p className="text-muted-foreground">
          Race a CPU, {ROUNDS_PER_STAGE} cards a stage. The first three show the answer and you type it exactly; the last three hide it and you
          type it from memory. Win {WINS_TO_CLEAR} to move up. Memory rounds schedule their card like a review.
        </p>
        <div className="mt-2 flex min-h-12 items-center justify-between gap-4">
          <label htmlFor="relaxed">Relaxed: the CPU types more slowly</label>
          <Switch id="relaxed" checked={relaxed} onCheckedChange={setRelaxedChoice} />
        </div>
      </Panel>
      <ol className="list-none p-0">
        {STAGES.map((s) => {
          const row = byStage.get(s.n);
          const locked = s.n > open;
          const status = row && row.clears > 0
            ? `Cleared${row.bestWpm ? `, best ${row.bestWpm} WPM` : ''}`
            : locked ? `Clear stage ${s.n - 1} first` : 'Open';
          return (
            <li key={s.n}>
              <Panel title={`Stage ${s.n}: ${s.name}`}>
                <p>
                  {s.mode === 'copy' ? 'Copy the answer' : 'Answer from memory'}. The CPU types at {s.wpm} WPM.
                </p>
                <p className="text-sm text-muted-foreground">{status}</p>
                <Button className="h-12 w-full" disabled={locked || !ready} onClick={() => begin(s)}>
                  {row && row.clears > 0 ? 'Play again' : 'Start stage'}
                </Button>
              </Panel>
            </li>
          );
        })}
      </ol>
      {ready ? null : <p role="status" className="text-muted-foreground">This track does not have enough short-answer cards for the typing stages yet.</p>}
      <Button variant="secondary" className="h-12 w-full" onClick={onExit}>Back</Button>
    </section>
  );
}
