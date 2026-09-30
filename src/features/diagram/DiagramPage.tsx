import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Check, Layers, List, Minus, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/8bit/sheet';
import { PageHead } from '@/components/Shell';
import { Panel } from '@/components/Panel';
import { href } from '@/app/route';
import { CARD_BY_ID } from '@/content';
import { DIAGRAM_ART, diagramById, type Diagram, type DiagramArt, type DiagramId } from '@/content/diagrams';
import { finishSession, flushOutbox, getSettings, startSession } from '@/db/repository';
import { todayKey } from '@/domain/day';
import { nextIndex, place, scoreLabels, type LabelScore } from '@/domain/diagram/diagram';
import { EMPTY_MATCH, matchScore, tryMatch, type MatchState } from '@/domain/diagram/match';
import { MIN_CARDS_FOR_XP, type SessionMode } from '@/domain/xp/kinds';
import { cn } from '@/lib/utils';

type Mode = 'explore' | 'label' | 'match';
type Placements = Record<string, string | undefined>;

/**
 * One diagram, four ways in (App Flow §5):
 * - Explore: pick a part, read its card.
 * - Label: pick a name, put it on a part, check.
 * - Match: pick a name, pick a part, and hear right or wrong at once.
 * - List: the same parts as text. The screen-reader path, and what shows if
 *   the art chunk fails to load.
 */
export default function DiagramPage({ id }: { id: string }) {
  const diagram = diagramById(id);
  if (!diagram) {
    return (
      <Panel title="No such diagram">
        <a className="text-(--color-accent) underline" href={href({ name: 'learn' })}>Back to Learn</a>
      </Panel>
    );
  }
  return <Viewer key={diagram.id} diagram={diagram} />;
}

/**
 * Records a diagram session lazily (nothing is written for a glance) and ends
 * it exactly once, including when the learner simply navigates away.
 */
function useDiagramSession(diagram: Diagram, mode: SessionMode) {
  const session = useRef<{ id: string; startedAt: number } | null>(null);
  const ended = useRef(false);

  const begin = useCallback(async () => {
    if (session.current) return;
    const at = Date.now();
    session.current = { id: '', startedAt: at };
    const settings = await getSettings();
    const row = await startSession(mode, diagram.trackId, todayKey(settings.timeZone), at);
    session.current = { id: row.id, startedAt: at };
  }, [diagram.trackId, mode]);

  const end = useCallback(async (reviewed: number, correct: number) => {
    const current = session.current;
    if (!current?.id || ended.current) return;
    ended.current = true;
    const at = Date.now();
    await finishSession(current.id, { reviewed, correct, activeMs: at - current.startedAt }, at);
    await flushOutbox(at);
  }, []);

  const reset = useCallback(() => {
    session.current = null;
    ended.current = false;
  }, []);

  return useMemo(() => ({ begin, end, reset }), [begin, end, reset]);
}

function Viewer({ diagram }: { diagram: Diagram }) {
  const [art, setArt] = useState<DiagramArt | null>(null);
  const [artFailed, setArtFailed] = useState(false);
  const [mode, setMode] = useState<Mode>('explore');
  const [listView, setListView] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [active, setActive] = useState(0);
  const [focused, setFocused] = useState<number | null>(null);
  const [openPart, setOpenPart] = useState<number | null>(null);
  const [viewed, setViewed] = useState<ReadonlySet<string>>(new Set());

  const [chip, setChip] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Placements>({});
  const [score, setScore] = useState<LabelScore | null>(null);
  const [status, setStatus] = useState('');
  const [matchState, setMatchState] = useState<MatchState>(EMPTY_MATCH);
  const [feedback, setFeedback] = useState<{ right: boolean; text: string; partId: string } | null>(null);

  const partRefs = useRef<Array<SVGGElement | null>>([]);
  const explore = useDiagramSession(diagram, 'diagram');
  const label = useDiagramSession(diagram, 'matching');
  const match = useDiagramSession(diagram, 'matching');
  const parts = diagram.parts;

  useEffect(() => {
    let live = true;
    DIAGRAM_ART[diagram.id as DiagramId]()
      .then((mod) => live && setArt(mod.default))
      .catch(() => live && setArtFailed(true));
    return () => { live = false; };
  }, [diagram.id]);

  // Leaving the page ends an explore session: five parts looked at is study.
  const viewedCount = useRef(0);
  viewedCount.current = viewed.size;
  useEffect(() => () => {
    if (viewedCount.current >= MIN_CARDS_FOR_XP) void explore.end(viewedCount.current, viewedCount.current);
  }, [explore]);

  // `L` flips to the list view, unless somebody is typing.
  useEffect(() => {
    function onKey(event: globalThis.KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [role="dialog"]')) return;
      if (event.key === 'l' || event.key === 'L') setListView((v) => !v);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const labels = useMemo(() => parts.map((p) => p.label).sort((a, b) => a.localeCompare(b)), [parts]);
  const showList = listView || artFailed;

  function openExplore(index: number) {
    setOpenPart(index);
    void explore.begin();
    setViewed((current) => new Set(current).add(parts[index].id));
  }

  function activate(index: number) {
    setActive(index);
    if (mode === 'explore') {
      openExplore(index);
      return;
    }
    if (mode === 'match') {
      matchPart(index);
      return;
    }
    if (score) return;
    if (!chip) {
      setStatus('Pick a name from the tray first, then the part it belongs on.');
      return;
    }
    void label.begin();
    setPlacements((current) => place(current, parts[index].id, chip));
    setStatus(`${chip} placed on part ${index + 1}.`);
    setChip(null);
  }

  function matchPart(index: number) {
    const part = parts[index];
    if (matchState.matched[part.id] !== undefined) return;
    if (!chip) {
      setStatus('Pick a name from the tray first, then the part it belongs on.');
      return;
    }
    void match.begin();
    const result = tryMatch(parts, matchState, part.id, chip);
    const text = result.correct
      ? `Right: part ${index + 1} is ${chip}.`
      : `Not that one: part ${index + 1} is not ${chip}. Try another part.`;
    setMatchState(result.state);
    setFeedback({ right: result.correct, text, partId: part.id });
    setStatus(text);
    if (result.correct) setChip(null);
    const after = matchScore(parts, result.state);
    if (after.done) {
      setStatus(`${text} All ${parts.length} matched, ${after.firstTry} on the first try.`);
      void match.end(parts.length, after.firstTry);
    }
  }

  function resetMatch() {
    setMatchState(EMPTY_MATCH);
    setFeedback(null);
    setChip(null);
    setStatus('');
    match.reset();
  }

  function onPartKey(event: KeyboardEvent, index: number) {
    const next = nextIndex(parts.length, index, event.key);
    if (next !== null) {
      event.preventDefault();
      setActive(next);
      partRefs.current[next]?.focus();
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      activate(index);
    }
  }

  function check() {
    const result = scoreLabels(parts, placements);
    setScore(result);
    setStatus(`${result.correct.length} of ${parts.length} right.`);
    void label.end(parts.length, result.correct.length);
  }

  function retry() {
    setPlacements({});
    setScore(null);
    setChip(null);
    setStatus('');
    label.reset();
  }

  const shown = mode === 'match' ? matchState.matched : placements;
  const placedLabels = new Set(Object.values(shown));
  const matchResult = matchScore(parts, matchState);
  const complete = scoreLabels(parts, placements).complete;
  const open = openPart === null ? null : parts[openPart];
  const openCard = open ? CARD_BY_ID.get(open.cardId) : undefined;

  return (
    <>
      <PageHead title={diagram.title} sub={diagram.blurb} />

      <div className="mb-6 flex flex-wrap items-center gap-3" role="group" aria-label="Mode">
        {(['explore', 'label', 'match'] as const).map((m) => (
          <Button
            key={m}
            variant={mode === m ? 'default' : 'secondary'}
            aria-pressed={mode === m}
            className="h-12 px-4"
            onClick={() => { setMode(m); setStatus(''); setChip(null); }}
          >
            {m === 'explore' ? 'Explore' : m === 'label' ? 'Label' : 'Match'}
          </Button>
        ))}
        <Button
          variant={showList ? 'default' : 'secondary'}
          aria-pressed={showList}
          disabled={artFailed}
          className="h-12 px-4"
          onClick={() => setListView((v) => !v)}
        >
          <List aria-hidden="true" /> List
        </Button>
        <Button asChild variant="secondary" className="h-12 px-4">
          <a href={href({ name: 'flashcards', deck: diagram.id })}>
            <Layers aria-hidden="true" /> Flashcards
          </a>
        </Button>
      </div>

      <p className="mb-4 text-sm text-muted-foreground">
        {mode === 'explore'
          ? `Tap a part, or Tab in and use the arrow keys. ${viewed.size} of ${parts.length} looked at.`
          : mode === 'label'
            ? 'Pick a name, then the part it belongs on. Keyboard: pick a name, arrow to the part, Enter.'
            : 'Pick a name, then its part: each pair is checked at once. Keyboard: pick a name, arrow to the part, Enter.'}
      </p>

      {artFailed ? (
        <p role="alert" className="mb-4 text-(--color-danger)">The picture could not load, so here are the same parts as a list.</p>
      ) : null}

      {mode !== 'explore' && (
        <Panel title="Names" id="tray">
          <ul className="flex flex-wrap gap-2" aria-label="Names to place">
            {labels.map((name) => {
              const selected = chip === name;
              const used = placedLabels.has(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    disabled={mode === 'match' ? used : score !== null}
                    onClick={() => setChip(selected ? null : name)}
                    className={cn(
                      'min-h-12 border-2 border-dashed px-3 text-sm',
                      selected ? 'border-solid border-(--color-accent) bg-primary text-primary-foreground' : 'border-border bg-secondary',
                      used && !selected && 'opacity-60 line-through',
                    )}
                  >
                    {name}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {mode === 'match' && feedback ? (
        // Between the tray and the picture, so a phone shows it next to the tap.
        <p className={cn('mb-4 flex items-center gap-2', feedback.right ? 'text-(--color-success)' : 'text-(--color-danger)')}>
          {feedback.right ? <Check aria-hidden="true" className="size-5 shrink-0" /> : <X aria-hidden="true" className="size-5 shrink-0" />}
          <span className="text-foreground">{feedback.text}</span>
        </p>
      ) : null}

      {!showList && art ? (
        <Panel className="p-3">
          <div className="mb-2 flex justify-end gap-3">
            <Button variant="secondary" size="icon" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z - 0.5))}>
              <Minus aria-hidden="true" />
            </Button>
            <Button variant="secondary" size="icon" aria-label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, z + 0.5))}>
              <Plus aria-hidden="true" />
            </Button>
          </div>
          <div className="overflow-auto">
            <svg
              viewBox={art.viewBox}
              style={{ width: `${zoom * 100}%` }}
              className="block aspect-square h-auto"
              role="group"
              aria-label={`${diagram.title}: ${parts.length} parts`}
            >
              {art.decor.map((shape, i) => (
                <path
                  key={i}
                  d={shape.d}
                  fill={shape.fill ? 'var(--color-surface-muted)' : 'none'}
                  stroke="var(--color-border)"
                  strokeWidth={0.6}
                  aria-hidden="true"
                />
              ))}
              {parts.map((part, index) => {
                const r = art.shapes[part.id];
                const placed = shown[part.id];
                const right = mode === 'match' ? placed !== undefined : score?.correct.includes(part.id);
                const wrong = mode === 'match' ? feedback?.partId === part.id && !feedback.right : score?.wrong.includes(part.id);
                const lit = mode === 'explore' ? viewed.has(part.id) || openPart === index : placed !== undefined;
                const name = mode === 'explore'
                  ? part.label
                  : `Part ${index + 1}${placed ? `, labelled ${placed}` : ', no label yet'}${right ? ', correct' : wrong ? (mode === 'match' ? ', wrong, try another name' : `, wrong: it is ${part.label}`) : ''}`;
                return (
                  <g
                    key={part.id}
                    ref={(el) => { partRefs.current[index] = el; }}
                    role="button"
                    tabIndex={index === active ? 0 : -1}
                    aria-label={name}
                    className="cursor-pointer outline-none"
                    onClick={() => activate(index)}
                    onKeyDown={(e) => onPartKey(e, index)}
                    onFocus={() => { setFocused(index); setActive(index); }}
                    onBlur={() => setFocused(null)}
                  >
                    <title>{mode === 'explore' ? part.label : `Part ${index + 1}`}</title>
                    <rect
                      x={r.x} y={r.y} width={r.w} height={r.h}
                      rx={r.round ? r.w / 2 : 0.6}
                      fill={lit ? 'color-mix(in srgb, var(--color-accent) 30%, var(--color-surface))' : 'var(--color-surface)'}
                      stroke={wrong ? 'var(--color-danger)' : lit ? 'var(--color-accent)' : 'var(--color-text-muted)'}
                      strokeWidth={0.8}
                    />
                    {mode !== 'explore' ? (
                      <text
                        x={r.x + r.w / 2} y={r.y + r.h / 2}
                        textAnchor="middle" dominantBaseline="central"
                        fontSize={3.2} fontFamily="var(--font-pixel)"
                        fill="var(--color-text)" aria-hidden="true"
                      >
                        {right ? '✓' : wrong ? '✗' : index + 1}
                      </text>
                    ) : null}
                    {focused === index ? (
                      <rect
                        x={r.x - 1.2} y={r.y - 1.2} width={r.w + 2.4} height={r.h + 2.4}
                        rx={r.round ? (r.w + 2.4) / 2 : 1}
                        fill="none" stroke="var(--color-focus)" strokeWidth={0.9}
                        aria-hidden="true"
                      />
                    ) : null}
                  </g>
                );
              })}
              <path d={art.detail.join(' ')} fill="none" stroke="var(--color-text-muted)" strokeWidth={0.35} pointerEvents="none" aria-hidden="true" />
            </svg>
          </div>
          <p className="mt-2 min-h-6 font-pixel text-[0.625rem]" aria-hidden="true">
            {focused !== null && mode === 'explore' ? `> ${parts[focused].label}` : ''}
          </p>
        </Panel>
      ) : null}

      {!showList && !art && !artFailed ? (
        <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>
      ) : null}

      {showList || mode !== 'explore' ? (
        <Panel title={mode === 'explore' ? 'Parts' : mode === 'label' ? 'Your labels' : 'Your matches'} id="parts">
          <ol className="divide-y-2 divide-dashed divide-border">
            {parts.map((part, index) => {
              const placed = shown[part.id];
              const right = mode === 'match' ? placed !== undefined : score?.correct.includes(part.id);
              const wrong = mode === 'match' ? feedback?.partId === part.id && !feedback.right : score?.wrong.includes(part.id);
              const card = CARD_BY_ID.get(part.cardId);
              return (
                <li key={part.id} className="flex min-h-12 items-center gap-3 py-3">
                  <span className="w-8 shrink-0 font-pixel text-xs text-muted-foreground">{index + 1}</span>
                  {mode === 'explore' ? (
                    <button type="button" className="flex-1 text-left" onClick={() => openExplore(index)}>
                      <span className="font-semibold">{part.label}</span>
                      {card ? <span className="block text-sm text-muted-foreground">{card.back}</span> : null}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex flex-1 items-center gap-2 text-left disabled:cursor-default"
                      disabled={mode === 'match' ? right : score !== null}
                      onClick={() => activate(index)}
                      aria-label={`Part ${index + 1}: ${placed ?? 'no label yet'}${chip ? `. Place ${chip} here` : ''}`}
                    >
                      {right ? <Check aria-hidden="true" className="size-4 text-(--color-success)" /> : null}
                      {wrong ? <X aria-hidden="true" className="size-4 text-(--color-danger)" /> : null}
                      <span className={cn(!placed && 'text-muted-foreground')}>{placed ?? '—'}</span>
                      {right ? <span className="sr-only">correct</span> : null}
                      {wrong ? (
                        <span className="text-sm text-muted-foreground">
                          {mode === 'match' ? '· wrong, try another name' : `· it is ${part.label}`}
                        </span>
                      ) : null}
                    </button>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
      ) : null}

      {mode === 'match' ? (
        <div className="mb-8">
          <p className="mb-3 font-pixel text-sm">
            {matchResult.matched}/{parts.length} matched{matchResult.done ? ` · ${matchResult.firstTry} first try` : ''}
          </p>
          {matchResult.done ? <Button className="h-12 w-full" onClick={resetMatch}>Play again</Button> : null}
        </div>
      ) : mode === 'label' ? (
        <div className="mb-8">
          {score ? (
            <>
              <p className="mb-3 font-pixel text-sm">{score.correct.length}/{parts.length} right</p>
              <Button className="h-12 w-full" onClick={retry}>Try again</Button>
            </>
          ) : (
            <Button className="h-12 w-full" disabled={!complete} onClick={check}>
              {complete ? 'Check' : `${Object.keys(placements).length}/${parts.length} placed`}
            </Button>
          )}
        </div>
      ) : (
        <Button
          variant="secondary"
          className="mb-8 h-12 w-full"
          onClick={() => {
            if (viewed.size >= MIN_CARDS_FOR_XP) void explore.end(viewed.size, viewed.size);
            window.location.hash = href({ name: 'learn' });
          }}
        >
          Done exploring
        </Button>
      )}

      <p className="sr-only" role="status" aria-live="polite">{status}</p>

      <Sheet open={open !== null} onOpenChange={(isOpen) => { if (!isOpen) setOpenPart(null); }}>
        <SheetContent
          side="bottom"
          font="normal"
          className="max-h-[80dvh] overflow-auto"
          // Opened without a trigger, so say where focus goes back to: the part.
          onCloseAutoFocus={(event) => {
            const part = partRefs.current[active];
            if (part) {
              event.preventDefault();
              part.focus();
            }
          }}
        >
          {open && openPart !== null ? (
            <div className="mx-auto max-w-(--shell-max) px-5 pt-8 pb-[calc(env(safe-area-inset-bottom)+24px)]">
              <SheetTitle className="font-pixel text-sm leading-relaxed">{open.label}</SheetTitle>
              <SheetDescription className="mt-3 text-base text-foreground">{openCard?.back}</SheetDescription>
              {openCard ? <p className="mt-3 text-muted-foreground">{openCard.why}</p> : null}
              <div className="mt-6 flex gap-4">
                <Button variant="secondary" className="h-12 flex-1" onClick={() => openExplore((openPart - 1 + parts.length) % parts.length)}>
                  Previous
                </Button>
                <Button className="h-12 flex-1" onClick={() => openExplore((openPart + 1) % parts.length)}>Next</Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
