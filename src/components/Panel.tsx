import type { ReactNode } from 'react';
import { Card } from '@/components/ui/8bit/card';
import { cn } from '@/lib/utils';

/**
 * An 8bitcn card in the body face. 8bitcn sets everything in Press Start 2P by
 * default, which is lovely for a heading and hard work for a paragraph, so the
 * pixel face is kept for titles and numbers.
 */
export function Panel({
  title, children, className, labelledBy, id,
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
  labelledBy?: string;
  id?: string;
}) {
  const headingId = labelledBy ?? (id ? `${id}-h` : undefined);
  return (
    <section aria-labelledby={title ? headingId : undefined} className="mb-8">
      <Card font="normal" className={cn('gap-3 px-5 py-5', className)}>
        {title ? (
          <h2 id={headingId} className="font-pixel text-xs uppercase leading-relaxed text-muted-foreground">
            {title}
          </h2>
        ) : null}
        {children}
      </Card>
    </section>
  );
}
