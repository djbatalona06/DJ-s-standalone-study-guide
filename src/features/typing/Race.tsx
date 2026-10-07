import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { Sprite } from '@/art/Sprite';
import { BOT_FRAMES } from '@/art/sprites';
import { checkTyped } from '@/domain/recall/check';
import {
  ROUND_CAP_MS, ROUNDS_PER_STAGE, WINS_TO_CLEAR, cpuChars, cpuFinishMs, pickTypingRounds, planCpu, progress, random,
  roundPoint, stageCleared, wpm, type CpuPlan, type Point, type Stage,
} from '@/domain/typing/typing';
import { todayKey } from '@/domain/day';
import type { SessionRow } from '../../db/database';
import { finishSession, flushOutbox, getSettings, gradeCard, recordStage, startSession, type FlushSummary } from '../../db/repository';
import type { Card, TrackId } from '../../content';
import { Character } from '../Character';
import { useSettings } from '../useApp';

/** A card left open for an hour is not an hour of study. */
const MAX_CARD_MS = 60_000;
const TICK_MS = 100;

interface RoundResult { point: Point; youMs: number | null; cpuMs: number; chars: number }

export interface StageSummary {
  stage: Stage;
  wins: number;
  rounds: number;
  cleared: boolean;
  /** Copy rounds only: characters typed over time taken. Zero when none were finished. */
  wpm: number;
  sent: FlushSummary | null;
  queued: boolean;
}

/** One run of one stage: five rounds against the CPU, then the result goes to `onDone`. */
export function Race({ trackId, stage, relaxed, pool, onDone, onExit }: {
  trackId: TrackId;
  stage: Stage;
  relaxed: boolean;
  pool: Card[];
  onDone: (summary: StageSummary) => void;
  onExit: () => void;
}) {
  const { characterName } = useSettings();
  const [seed] = useState(() => Date.now());
  const rounds = useMemo(() => pickTypingRounds(pool, seed), [pool, seed]);
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<'ready' | 'running' | 'over'>('ready');
  const [typed, setTyped] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [fault, setFault] = useState<string | null>(null);

  const next = useRef(random(seed ^ 0x9e3779b9));
  const plan = useRef<CpuPlan | null>(null);
  const session = useRef<SessionRow | null>(null);
  const day = useRef('');
  const startedAt = useRef(0);
  /** True only while a round can still end; stops a keystroke and a tick both ending it. */
  const live = useRef(false);
  const tally = useRef({ reviewed: 0, correct: 0, activeMs: 0 });
  const all = useRef<RoundResult[]>([]);

  const round = rounds[i];
  const target = round?.target ?? '';
  const copy = stage.mode === 'copy';

  async function go() {
    try {
      if (!session.current) {
        const settings = await getSettings();
        day.current = todayKey(settings.timeZone);
        session.current = await startSession('typing', trackId, day.current, Date.now());
      }
      plan.current = planCpu(next.current, stage, relaxed);
      setTyped('');
      setElapsed(0);
      startedAt.current = Date.now();
      live.current = true;
      setPhase('running');
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not start the round.');
    }
  }

  async function end(youMs: number | null) {
    if (!live.current || !plan.current || !session.current) return;
    live.current = false;
    const ms = Date.now() - startedAt.current;
    const cpuMs = cpuFinishMs(plan.current, target.length);
    const result: RoundResult = { point: roundPoint(youMs, cpuMs), youMs, cpuMs, chars: target.length };
    all.current = [...all.current, result];
    setResults(all.current);
    setElapsed(ms);
    setPhase('over');
    tally.current = {
      reviewed: tally.current.reviewed + 1,
      correct: tally.current.correct + (youMs !== null ? 1 : 0),
      activeMs: tally.current.activeMs + Math.min(MAX_CARD_MS, ms),
    };
    // Typing what you can see proves nothing about memory, so only a recall round schedules its card.
    if (!copy) {
      try {
        await gradeCard(round.card.id, youMs !== null ? 'good' : 'again', session.current.id, day.current, Date.now());
      } catch (error) {
        setFault(error instanceof Error ? error.message : 'Could not save that answer.');
      }
    }
  }

  // The CPU's clock. It also ends the round when the CPU finishes first, or when the cap runs out.
  useEffect(() => {
    if (phase !== 'running') return;
    const id = window.setInterval(() => {
      const ms = Date.now() - startedAt.current;
      setElapsed(ms);
      if (plan.current && ms >= Math.min(cpuFinishMs(plan.current, target.length), ROUND_CAP_MS)) void end(null);
    }, TICK_MS);
    return () => window.clearInterval(id);
    // `end` reads refs and the round's target only, so it is safe to leave out.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, i]);

  async function advance() {
    if (i + 1 < rounds.length) {
      setI(i + 1);
      setPhase('ready');
      return;
    }
    try {
      const wins = all.current.filter((r) => r.point === 'you').length;
      const typedRounds = copy ? all.current.filter((r) => r.youMs !== null && r.youMs <= ROUND_CAP_MS) : [];
      const speed = wpm(typedRounds.reduce((n, r) => n + r.chars, 0), typedRounds.reduce((n, r) => n + (r.youMs ?? 0), 0));
      const cleared = stageCleared(wins);
      await recordStage(trackId, stage.n, { cleared, wpm: speed }, Date.now());
      const { queued } = await finishSession(session.current!.id, tally.current, Date.now());
      const sent = queued ? await flushOutbox(Date.now()) : null;
      onDone({ stage, wins, rounds: all.current.length, cleared, wpm: speed, sent, queued });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save the stage.');
    }
  }

  if (fault) {
    return (
      <Panel title="Something went wrong">
        <p role="alert">{fault}</p>
        <Button className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
      </Panel>
    );
  }
  if (!round) return null;

  const you = progress(typed, target);
  const cpu = plan.current && phase !== 'ready' ? cpuChars(plan.current, elapsed, target.length) : 0;
  const last = results[results.length - 1];
  const won = results.filter((r) => r.point === 'you').length;
  const lost = results.filter((r) => r.point === 'cpu').length;

  return (
    <section aria-label={`Typing stage ${stage.n}, ${stage.name}`}>
      <h1 className="sr-only">Typing stage {stage.n}: {stage.name}</h1>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Character size={72} label={characterName || 'Your character'} />
        <p className="text-center font-pixel text-xs leading-relaxed" aria-live="polite">
          {stage.name}<br />Round {i + 1} of {rounds.length}
        </p>
        <Sprite frames={BOT_FRAMES} size={72} label={`The ${stage.name} CPU, a small robot`} />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        You {won}, CPU {lost}. Win {WINS_TO_CLEAR} of {ROUNDS_PER_STAGE} to clear the stage.
      </p>

      {phase === 'ready' ? (
        <Panel className="min-h-48">
          <p className="font-pixel text-[0.625rem] uppercase text-muted-foreground">{copy ? 'Copy it' : 'From memory'}</p>
          <p>
            {copy
              ? 'The answer is shown. Type it exactly, faster than the CPU.'
              : 'The answer is hidden. Type it from memory and press Enter before the CPU does.'}
          </p>
          <Button className="mt-2 h-14 w-full" autoFocus onClick={() => void go()}>Go</Button>
          <Button variant="secondary" className="h-12 w-full" onClick={onExit}>Leave the stage</Button>
        </Panel>
      ) : (
        <>
          <Meter label="You" value={Math.min(100, (copy ? you.correct : typed.length) / target.length * 100)} />
          <Meter label={`CPU ${stage.name}`} value={(cpu / target.length) * 100} />
          <Panel className="min-h-48">
            <p className="font-pixel text-[0.625rem] uppercase text-muted-foreground">Question</p>
            <p className="text-xl font-semibold leading-snug">{round.card.front}</p>

            {phase === 'running' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!copy && typed.trim()) void end(checkTyped(typed, target).verdict === 'correct' ? Date.now() - startedAt.current : null);
                }}
              >
                {copy ? (
                  <>
                    <p className="sr-only">Type: {target}</p>
                    <p aria-hidden="true" className="mb-3 break-words text-xl leading-relaxed" data-testid="target">
                      <span className="text-(--color-success)">{target.slice(0, you.correct)}</span>
                      <span className={you.wrong ? 'border-b-4 border-(--color-danger) text-(--color-danger)' : 'border-b-4 border-(--color-accent)'}>
                        {target.slice(you.correct, you.correct + 1)}
                      </span>
                      <span className="text-muted-foreground">{target.slice(you.correct + 1)}</span>
                    </p>
                    <p role="status" className="min-h-6 text-sm">{you.wrong ? 'Typo. Backspace to fix it.' : ''}</p>
                  </>
                ) : null}
                <label htmlFor="typing-input" className="mb-2 block text-sm font-semibold">
                  {copy ? 'Type it here' : 'Type the answer, then press Enter'}
                </label>
                <Input
                  id="typing-input"
                  font="normal"
                  className="h-12 text-base"
                  value={typed}
                  onChange={(e) => {
                    setTyped(e.target.value);
                    if (copy && progress(e.target.value, target).done) void end(Date.now() - startedAt.current);
                  }}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  autoFocus
                />
                {copy ? null : <Button type="submit" className="mt-3 h-12 w-full" disabled={!typed.trim()}>Answer</Button>}
              </form>
            ) : (
              <div role="status" className="border-t-2 border-dashed border-border pt-3">
                <p><strong>Answer:</strong> {target}</p>
                <p className="mt-2">{verdict(last, copy)} Score: you {won}, CPU {lost}.</p>
                <p className="mt-2 text-sm text-muted-foreground"><strong>Why:</strong> {round.card.why}</p>
              </div>
            )}
          </Panel>
          {phase === 'over' ? (
            <Button className="h-14 w-full" autoFocus onClick={() => void advance()}>
              {i + 1 < rounds.length ? 'Next round' : 'See result'}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}

/** One plain sentence on how the round ended, never by colour alone. */
function verdict(r: RoundResult | undefined, copy: boolean): string {
  if (!r) return '';
  const secs = (ms: number) => `${(ms / 1000).toFixed(1)} s`;
  if (r.point === 'you') {
    return copy
      ? `You took the round in ${secs(r.youMs!)} (${wpm(r.chars, r.youMs!)} WPM).`
      : `Right, and before the CPU. You took the round in ${secs(r.youMs!)}.`;
  }
  if (r.point === 'cpu') {
    if (r.youMs === null) return copy ? 'The CPU got there first.' : 'Not quite, so the CPU takes it.';
    return 'Right, but the CPU was quicker.';
  }
  return r.youMs === null ? 'Nobody finished, so nobody scores.' : 'Right, and the CPU blanked.';
}
