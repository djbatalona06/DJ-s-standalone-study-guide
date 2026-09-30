import { Panel } from '@/components/Panel';
import { PageHead } from '@/components/Shell';
import { href } from '@/app/route';
import { STAGES } from '@/art/sprites';
import { PATHWAY } from '@/content/pathway';
import { levelOf, nextActions, statuses, unmet } from '@/domain/pathway/pathway';
import { Character } from '../Character';
import { useSettings } from '../useApp';
import { usePathMarks, useStage } from '../usePath';
import { StatusBadge, TYPE_LABEL, TypeIcon } from './parts';

const byId = new Map(PATHWAY.map((node) => [node.id, node]));

export function PathPage() {
  const marks = usePathMarks();
  const stage = useStage();
  const { characterName } = useSettings();
  if (!marks) return <p className="font-pixel text-xs text-muted-foreground">loading<span className="cursor" /></p>;

  const status = statuses(PATHWAY, marks);
  const next = nextActions(PATHWAY, status);
  const done = PATHWAY.filter((n) => status.get(n.id) === 'done').length;

  return (
    <>
      <PageHead title="Path" sub="From a first A+ to a cloud role. Hours are rough estimates, and nothing here promises a job." />

      <Panel>
        <div className="flex items-center gap-5">
          <Character size={88} label={`${characterName || 'Your character'}, typing on a laptop`} />
          <div>
            <p className="font-pixel text-sm leading-relaxed">Lvl {levelOf(stage)} · {stage}</p>
            <p className="text-sm text-muted-foreground">{done} of {PATHWAY.length} steps done. He moves up when you finish a role or certification that opens the next stage.</p>
          </div>
        </div>
      </Panel>

      <Panel title="Next up" id="next">
        {next.length === 0 ? <p className="text-muted-foreground">Everything open is done. Nice work.</p> : (
          <ul className="divide-y-2 divide-dashed divide-border">
            {next.map((node) => (
              <li key={node.id}>
                <a href={href({ name: 'node', id: node.id })} className="flex min-h-12 items-center justify-between gap-3 py-3 text-(--color-accent) underline-offset-4 hover:underline">
                  <span>{node.title}</span>
                  <span className="text-sm text-muted-foreground">about {node.hours} h</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {STAGES.map((s) => (
        <Panel key={s} title={`Level ${levelOf(s)} · ${s}`} id={`stage-${levelOf(s)}`}>
          <ul className="divide-y-2 divide-dashed divide-border">
            {PATHWAY.filter((n) => n.stage === s).map((node) => {
              const state = status.get(node.id) ?? 'locked';
              const missing = unmet(node, marks).map((id) => byId.get(id)?.title).filter(Boolean);
              return (
                <li key={node.id}>
                  <a href={href({ name: 'node', id: node.id })} className="flex min-h-12 items-start gap-3 py-3 no-underline">
                    <TypeIcon type={node.type} className="mt-0.5 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{node.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {TYPE_LABEL[node.type]} · about {node.hours} h
                        {state === 'locked' && missing.length ? ` · needs ${missing.join(', ')}` : ''}
                      </span>
                    </span>
                    <StatusBadge status={state} />
                  </a>
                </li>
              );
            })}
          </ul>
        </Panel>
      ))}
    </>
  );
}
