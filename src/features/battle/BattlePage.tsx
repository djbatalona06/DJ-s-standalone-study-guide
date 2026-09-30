import { useRef, useState } from 'react';
import { Button } from '@/components/ui/8bit/button';
import { Input } from '@/components/ui/8bit/input';
import { Switch } from '@/components/ui/8bit/switch';
import { Meter } from '@/components/Meter';
import { Panel } from '@/components/Panel';
import { Sprite } from '@/art/Sprite';
import { BOT_FRAMES } from '@/art/sprites';
import { BOT_LEVELS, ROUNDS, battleEligible, botAnswer, pickBattleCards, pointFor, random, winner, type BotAnswer, type BotLevel, type Point } from '@/domain/recall/battle';
import { checkTyped, type Checked } from '@/domain/recall/check';
import { todayKey } from '@/domain/day';
import type { SessionRow } from '../../db/database';
import { finishSession, flushOutbox, getSettings, gradeCard, startSession, type FlushSummary } from '../../db/repository';
import type { Card, TrackId } from '../../content';
import { Character } from '../Character';
import { useSettings } from '../useApp';
import { useLibrary } from '../useLibrary';
import { XpLine } from '../XpLine';

const POINT_TEXT: Record<Point, string> = { you: 'Point to you.', bot: 'Point to the bot.', none: 'No point.' };
/** A card left open for an hour is not an hour of study. */
const MAX_CARD_MS = 60_000;

interface Played { checked: Checked; bot: BotAnswer; point: Point; youMs: number }

export function BattlePage({ trackId, onExit }: { trackId: TrackId; onExit: () => void }) {
  const library = useLibrary();
  const { characterName } = useSettings();
  const [level, setLevel] = useState<BotLevel>(BOT_LEVELS[1]);
  const [race, setRace] = useState(false);
  const [cards, setCards] = useState<Card[] | null>(null);
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState('');
  const [played, setPlayed] = useState<Played | null>(null);
  const [score, setScore] = useState({ you: 0, bot: 0 });
  const [done, setDone] = useState<{ sent: FlushSummary | null; queued: boolean } | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const session = useRef<SessionRow | null>(null);
  const day = useRef('');
  const next = useRef<() => number>(() => 0);
  const shownAt = useRef(0);
  const tally = useRef({ reviewed: 0, correct: 0, activeMs: 0 });
  const busy = useRef(false);

  if (!library) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;
  const pool = library.cardsOfTrack(trackId).filter((card) => battleEligible(card.back));

  async function start() {
    try {
      const settings = await getSettings();
      day.current = todayKey(settings.timeZone);
      session.current = await startSession('battle', trackId, day.current, Date.now());
      const seed = Date.now();
      next.current = random(seed);
      tally.current = { reviewed: 0, correct: 0, activeMs: 0 };
      setScore({ you: 0, bot: 0 });
      setRound(0);
      setTyped('');
      setPlayed(null);
      setDone(null);
      setCards(pickBattleCards(pool, seed));
      shownAt.current = Date.now();
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not start the battle.');
    }
  }

  async function submit(card: Card) {
    if (busy.current || played || !session.current) return;
    busy.current = true;
    try {
      const at = Date.now();
      const checked = checkTyped(typed, card.back);
      const youCorrect = checked.verdict === 'correct';
      const youMs = at - shownAt.current;
      const bot = botAnswer(next.current, level, card.back);
      const point = pointFor(youCorrect, bot, youMs, race);
      // A battle answer is a real review: right is Good, anything else is Again.
      await gradeCard(card.id, youCorrect ? 'good' : 'again', session.current.id, day.current, at);
      tally.current = {
        reviewed: tally.current.reviewed + 1,
        correct: tally.current.correct + (youCorrect ? 1 : 0),
        activeMs: tally.current.activeMs + Math.min(MAX_CARD_MS, youMs),
      };
      setScore((s) => ({ you: s.you + (point === 'you' ? 1 : 0), bot: s.bot + (point === 'bot' ? 1 : 0) }));
      setPlayed({ checked, bot, point, youMs });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save that answer.');
    } finally {
      busy.current = false;
    }
  }

  async function advance(total: number) {
    if (round + 1 < total) {
      setRound(round + 1);
      setTyped('');
      setPlayed(null);
      shownAt.current = Date.now();
      return;
    }
    try {
      const { queued } = await finishSession(session.current!.id, tally.current, Date.now());
      setDone({ sent: queued ? await flushOutbox(Date.now()) : null, queued });
    } catch (error) {
      setFault(error instanceof Error ? error.message : 'Could not save the battle.');
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

  if (!cards) {
    const ready = pool.length >= ROUNDS * 2;
    return (
      <section aria-label="Battle the bot">
        <h1 className="mb-4 font-pixel text-sm leading-relaxed">Battle the bot</h1>
        <Panel>
          <p className="text-muted-foreground">
            {ROUNDS} short cards. You and the bot answer each one; a correct answer scores. Every answer also schedules its card, like a review.
          </p>
          <p id="level-label" className="mt-4 text-sm font-semibold">Bot level</p>
          <div role="group" aria-labelledby="level-label" className="mt-2 flex flex-wrap gap-2">
            {BOT_LEVELS.map((l) => (
              <Button
                key={l.id}
                type="button"
                variant={l.id === level.id ? 'default' : 'secondary'}
                aria-pressed={l.id === level.id}
                className="h-12 min-w-fit flex-1"
                onClick={() => setLevel(l)}
              >
                {l.label}
              </Button>
            ))}
          </div>
          <div className="mt-4 flex min-h-12 items-center justify-between gap-4">
            <label htmlFor="race">Race: when you both get it right, the faster one scores</label>
            <Switch id="race" checked={race} onCheckedChange={setRace} />
          </div>
          {ready ? null : <p role="status" className="mt-2 text-muted-foreground">This deck does not have enough short-answer cards for a battle yet.</p>}
          <Button className="mt-4 h-14 w-full" disabled={!ready} onClick={() => void start()}>Start battle</Button>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onExit}>Back</Button>
        </Panel>
      </section>
    );
  }

  if (done) {
    const result = winner(score.you, score.bot);
    return (
      <section aria-live="polite" className="flex flex-col items-center gap-6 text-center">
        <Character size={112} label={`${characterName || 'Your character'}, typing on a laptop`} />
        <h1 className="font-pixel text-sm leading-relaxed">
          {result === 'you' ? 'You won' : result === 'bot' ? 'The bot won' : 'A draw'}
        </h1>
        <Panel className="w-full text-left">
          <p className="font-pixel text-2xl">{score.you} to {score.bot}</p>
          <p className="text-muted-foreground">{tally.current.correct} of {tally.current.reviewed} answered right.</p>
          <XpLine done={done} reviewed={tally.current.reviewed} />
          <Button className="mt-3 h-12 w-full" onClick={() => setCards(null)}>Battle again</Button>
          <Button variant="secondary" className="mt-3 h-12 w-full" onClick={onExit}>Back to Learn</Button>
        </Panel>
      </section>
    );
  }

  const card = cards[round];
  return (
    <section aria-label="Battle the bot">
      <h1 className="sr-only">Battle the bot</h1>
      <div className="mb-4 flex items-center justify-between gap-4">
        <Character size={72} label={`${characterName || 'Your character'}`} />
        <p className="font-pixel text-xs" aria-live="polite">Round {round + 1} of {cards.length}</p>
        <Sprite frames={BOT_FRAMES} size={72} label={`The ${level.label} bot, a small robot`} />
      </div>
      <Meter label="You" value={(score.you / cards.length) * 100} />
      <Meter label="Bot" value={(score.bot / cards.length) * 100} />

      <Panel className="min-h-48">
        <p className="font-pixel text-[0.625rem] uppercase text-muted-foreground">Question</p>
        <p className="text-xl font-semibold leading-snug">{card.front}</p>
        {played ? (
          <div role="status" className="border-t-2 border-dashed border-border pt-3">
            <p><strong>Answer:</strong> {card.back}</p>
            <p className="mt-2">
              You: {played.checked.verdict === 'correct' ? 'correct' : played.checked.verdict === 'close' ? 'close, which does not score' : 'not quite'}.
              {' '}Bot: {played.bot.correct ? 'correct' : 'wrong'}.
              {race && played.checked.verdict === 'correct' && played.bot.correct
                ? ` You took ${(played.youMs / 1000).toFixed(1)} s, the bot ${(played.bot.ms / 1000).toFixed(1)} s.`
                : ''}
              {' '}<strong>{POINT_TEXT[played.point]}</strong> Score: you {score.you}, bot {score.bot}.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void submit(card); }}>
            <label htmlFor="battle-input" className="mb-2 block text-sm font-semibold">Type the answer</label>
            <Input
              id="battle-input"
              font="normal"
              className="h-12 text-base"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            <Button type="submit" className="mt-3 h-12 w-full" disabled={!typed.trim()}>Answer</Button>
          </form>
        )}
      </Panel>
      {played ? (
        <Button className="h-14 w-full" autoFocus onClick={() => void advance(cards.length)}>
          {round + 1 < cards.length ? 'Next round' : 'See result'}
        </Button>
      ) : null}
    </section>
  );
}
