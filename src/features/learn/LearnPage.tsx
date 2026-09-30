import { Cpu } from 'lucide-react';
import { Button } from '@/components/ui/8bit/button';
import { Progress } from '@/components/ui/8bit/progress';
import { PageHead } from '@/components/Shell';
import { Panel } from '@/components/Panel';
import { href } from '@/app/route';
import { go } from '@/app/useRoute';
import { diagramsOf } from '@/content/diagrams';
import { TRACKS, cardsOfDomain, cardsOfTrack, domainsOf } from '@/content';
import { domainMastery } from '@/domain/mastery/readiness';
import { useStates } from '../useApp';

export function LearnPage() {
  const states = useStates();
  if (!states) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  return (
    <>
      <PageHead title="Learn" sub="Three tracks. Domains follow the exam's own outline, weighted as the exam weights them." />

      {TRACKS.map((track) => {
        const hasCards = cardsOfTrack(track.id).length > 0;
        return (
          <Panel key={track.id} id={`t-${track.id}`} title={track.title}>
            <p className="text-sm text-muted-foreground">
              {track.exam
                ? `${track.exam.code} · ${track.exam.questions} questions · ${track.exam.minutes} min · pass ${track.exam.passMark}/${track.exam.scale}`
                : track.objectiveVersion}
            </p>
            <ul className="divide-y-2 divide-dashed divide-border">
              {domainsOf(track.id).map((domain) => {
                const cards = cardsOfDomain(domain.id);
                const mastery = domainMastery(
                  { id: domain.id, weight: domain.weight, cardIds: cards.map((c) => c.id) },
                  states,
                );
                const pct = Math.round(mastery.mastery * 100);
                return (
                  <li key={domain.id} className="py-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-semibold">{domain.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {' '}· {track.exam ? `${Math.round(domain.weight * 100)}% of exam` : domain.code}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {cards.length === 0 ? 'no cards yet' : <><span className="font-pixel text-xs text-foreground">{pct}%</span> · {cards.length}</>}
                      </span>
                    </div>
                    {cards.length > 0 ? (
                      <Progress variant="retro" value={pct} className="mt-3 h-2" aria-label={`${domain.title} mastery ${pct}%`} />
                    ) : null}
                    {diagramsOf(domain.id).map((diagram) => (
                      <a
                        key={diagram.id}
                        href={href({ name: 'diagram', id: diagram.id })}
                        className="mt-3 inline-flex min-h-12 items-center gap-2 text-(--color-accent) underline-offset-4 hover:underline"
                      >
                        <Cpu aria-hidden="true" className="size-4" /> Diagram: {diagram.title}
                      </a>
                    ))}
                  </li>
                );
              })}
            </ul>
            {hasCards ? (
              <Button className="mt-2 h-12 w-full" onClick={() => go({ name: 'review', track: track.id })}>
                Review {track.title}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Cards are on their way. Verify the weights against CompTIA's official objectives before
                you rely on the percentages.
              </p>
            )}
          </Panel>
        );
      })}
    </>
  );
}
