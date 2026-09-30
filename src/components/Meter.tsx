import { Progress } from '@/components/ui/8bit/progress';

/** A pixel bar plus the number, never the colour alone (UI brief §3). */
export function Meter({ label, value, detail }: { label: string; value: number; detail?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className="my-3">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-pixel text-xs">{pct}%</span>
      </div>
      <Progress variant="retro" value={pct} aria-label={`${label}: ${pct}%`} className="h-3" />
      {detail ? <p className="mt-2 text-sm text-muted-foreground">{detail}</p> : null}
    </div>
  );
}
