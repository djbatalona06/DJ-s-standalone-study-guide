import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb, RotateCcw, Shuffle } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Kbd } from '@/components/ui/8bit/kbd';
import { Progress } from '@/components/ui/8bit/progress';
import { PageHead } from '@/components/Shell';
import { Panel } from '@/components/Panel';
import { href } from '@/app/route';
import type { Library } from '@/content';
import { useLibrary } from '../useLibrary';
import { DIAGRAMS } from '@/content/diagrams';
import { shuffled, step } from '@/domain/flashcards';
import { cn } from '@/lib/utils';

/**
 * Flashcards mode, laid out like Quizlet's: one big card that flips, arrows
 * either side, a counter, shuffle, and every term listed underneath. It is for
 * browsing and cramming, so nothing is graded or scheduled here; Review does
 * that.
 */
export function FlashcardsPage({ deckId }: { deckId: string }) {
  const library = useLibrary();
  if (!library) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;
  return <Flashcards deckId={deckId} library={library} />;
}

function Flashcards({ deckId, library }: { deckId: string; library: Library }) {
  const deck = useMemo(() => library.deckById(deckId, Object.values(DIAGRAMS)), [library, deckId]);
  const [seed, setSeed] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [hint, setHint] = useState(false);

  const cards = useMemo(() => {
    if (!deck) return [];
    return seed === null ? deck.cards : shuffled(deck.cards, seed);
  }, [deck, seed]);
  const count = cards.length;
  const card = cards[index];

  function go(delta: -1 | 1) {
    setIndex((i) => step(i, count, delta));
    setFlipped(false);
    setHint(false);
  }

  function restart(shuffle: boolean) {
    setSeed(shuffle ? Date.now() : null);
    setIndex(0);
    setFlipped(false);
    setHint(false);
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, [role="dialog"]')) return;
      if (event.key === 'ArrowRight') go(1);
      else if (event.key === 'ArrowLeft') go(-1);
      else if ((event.key === 'h' || event.key === 'H') && !flipped) setHint(true);
      else if (event.key === ' ' && !target.closest('button, a')) {
        event.preventDefault();
        setFlipped((f) => !f);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!deck || count === 0) {
    return (
      <Panel title="No cards here yet">
        <a className="text-(--color-accent) underline" href={href({ name: 'learn' })}>Back to Learn</a>
      </Panel>
    );
  }

  const done = index >= count;

  return (
    <>
      <PageHead title={deck.title} sub={`Flashcards · ${count} terms`} />

      <div className="mb-3 flex items-center gap-4">
        <Progress
          variant="retro"
          className="h-3 flex-1"
          value={Math.round((Math.min(index + 1, count) / count) * 100)}
          aria-label={`Card ${Math.min(index + 1, count)} of ${count}`}
        />
        <p className="font-pixel text-xs" aria-live="polite">{Math.min(index + 1, count)} / {count}</p>
      </div>

      {done ? (
        <Panel title="Nice work" id="fc-done">
          <p className="font-pixel text-xl leading-snug">All {count} cards</p>
          <p className="text-muted-foreground">
            Go round again, shuffle them, or review them properly so they come back just before you
            would forget.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Button variant="secondary" className="h-12" onClick={() => restart(false)}>
              <RotateCcw aria-hidden="true" /> Start over
            </Button>
            <Button variant="secondary" className="h-12" onClick={() => restart(true)}>
              <Shuffle aria-hidden="true" /> Shuffle
            </Button>
          </div>
          <Button asChild className="mt-4 h-12 w-full">
            <a href={href({ name: 'review', track: deck.trackId })}>Review with spaced repetition</a>
          </Button>
        </Panel>
      ) : (
        <>
          <div className="mb-3 flex min-h-12 items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="h-12 px-2"
              onClick={() => setHint(true)}
              disabled={flipped || hint}
              aria-expanded={hint}
              aria-controls="fc-hint"
            >
              <Lightbulb aria-hidden="true" className="text-(--color-xp)" /> {hint ? 'Hint shown' : 'Get a hint'}
            </Button>
            <p className="hidden text-sm text-muted-foreground min-[900px]:block">
              <Kbd>Space</Kbd> flip · <Kbd>←</Kbd> <Kbd>→</Kbd> move · <Kbd>H</Kbd> hint
            </p>
          </div>

          {/* The card. Both faces are in the DOM for the flip; the hidden one is
              hidden from screen readers too, so only what shows is read. */}
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? 'Answer side. Flip back to the question' : 'Question side. Flip to see the answer'}
            className="group mb-6 block w-full text-left perspective-distant"
          >
            <div
              className={cn(
                'grid min-h-72 w-full transition-transform duration-500 transform-3d',
                flipped && 'rotate-y-180',
              )}
            >
              <Face side="front" hidden={flipped}>
                <p className="font-pixel text-[0.625rem] uppercase text-muted-foreground">Term</p>
                <p className="my-auto py-6 text-center text-2xl font-semibold leading-snug">{card.front}</p>
                <div id="fc-hint" aria-live="polite">
                  {hint ? (
                    <p className="border-t-2 border-dashed border-border pt-3 text-(--color-xp)">
                      <span className="font-pixel text-[0.625rem] uppercase">Hint · </span>{card.hint}
                    </p>
                  ) : null}
                </div>
              </Face>
              <Face side="back" hidden={!flipped}>
                <p className="font-pixel text-[0.625rem] uppercase text-(--color-accent)">Definition</p>
                <p className="my-auto py-4 text-center text-xl leading-snug">{card.back}</p>
                <p className="border-t-2 border-dashed border-border pt-3 text-sm text-muted-foreground">{card.why}</p>
              </Face>
            </div>
          </button>

          <div className="mb-8 flex items-center justify-center gap-6">
            <Button variant="secondary" size="icon" className="size-12" aria-label="Previous card" disabled={index === 0} onClick={() => go(-1)}>
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              variant={seed === null ? 'secondary' : 'default'}
              className="h-12 px-4"
              aria-pressed={seed !== null}
              onClick={() => restart(seed === null)}
            >
              <Shuffle aria-hidden="true" /> Shuffle
            </Button>
            <Button variant="secondary" size="icon" className="size-12" aria-label="Next card" onClick={() => go(1)}>
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </>
      )}

      <Panel title={`Terms in this set (${count})`} id="fc-terms">
        <ol className="divide-y-2 divide-dashed divide-border">
          {deck.cards.map((c) => (
            <li key={c.id} className="grid gap-1 py-3 min-[600px]:grid-cols-[2fr_3fr] min-[600px]:gap-6">
              <span className="font-semibold">{c.front}</span>
              <span className="text-muted-foreground">{c.back}</span>
            </li>
          ))}
        </ol>
      </Panel>
    </>
  );
}

function Face({ side, hidden, children }: { side: 'front' | 'back'; hidden: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={hidden}
      className={cn(
        'col-start-1 row-start-1 flex flex-col border-6 border-foreground bg-card p-5 backface-hidden dark:border-ring',
        'group-hover:bg-secondary',
        side === 'back' && 'rotate-y-180',
      )}
    >
      {children}
    </div>
  );
}
