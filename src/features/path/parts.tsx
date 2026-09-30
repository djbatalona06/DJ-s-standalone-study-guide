import { Award, Briefcase, Circle, CircleCheck, CircleDot, FolderGit2, Lock, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NodeStatus, NodeType } from '@/domain/pathway/pathway';

export const TYPE_LABEL: Record<NodeType, string> = { role: 'Role', cert: 'Certification', skill: 'Skill', project: 'Project' };
const TYPE_ICON = { role: Briefcase, cert: Award, skill: Wrench, project: FolderGit2 } as const;

const STATUS = {
  locked: { label: 'Locked', Icon: Lock, tone: 'text-muted-foreground' },
  available: { label: 'Open', Icon: Circle, tone: 'text-foreground' },
  'in-progress': { label: 'In progress', Icon: CircleDot, tone: 'text-(--color-xp)' },
  done: { label: 'Done', Icon: CircleCheck, tone: 'text-(--color-success)' },
} as const;

export function TypeIcon({ type, className }: { type: NodeType; className?: string }) {
  const Icon = TYPE_ICON[type];
  return <Icon aria-hidden="true" className={cn('size-5 shrink-0', className)} />;
}

/** An icon and a word, never colour alone. */
export function StatusBadge({ status }: { status: NodeStatus }) {
  const { label, Icon, tone } = STATUS[status];
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1 text-sm font-semibold', tone)}>
      <Icon aria-hidden="true" className="size-4" /> {label}
    </span>
  );
}
