import type { ReactNode } from 'react';
import { BookOpen, Milestone, Terminal, User } from 'lucide-react';
import { href, type Route } from '@/app/route';
import { cn } from '@/lib/utils';
import { UpdateBanner } from './UpdateBanner';

const TABS = [
  { route: { name: 'today' }, label: 'Today', Icon: Terminal },
  { route: { name: 'learn' }, label: 'Learn', Icon: BookOpen },
  { route: { name: 'path' }, label: 'Path', Icon: Milestone },
  { route: { name: 'me' }, label: 'Me', Icon: User },
] as const satisfies ReadonlyArray<{ route: Route; label: string; Icon: unknown }>;

/**
 * Bottom tabs on a phone, a left rail from 900 px (UI brief §8). The tabs are
 * links, so the browser's own back button and middle-click work.
 */
export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const current = route.name === 'diagram' || route.name === 'flashcards' ? 'learn' : route.name === 'node' ? 'path' : route.name;
  return (
    <div className="min-h-dvh min-[900px]:grid min-[900px]:grid-cols-[220px_1fr]">
      <UpdateBanner />
      <nav
        aria-label="Sections"
        className={cn(
          'fixed inset-x-0 bottom-0 z-10 flex justify-around border-t-4 border-foreground bg-card px-2 pt-2 dark:border-ring',
          'pb-[calc(env(safe-area-inset-bottom)+8px)]',
          'min-[900px]:sticky min-[900px]:top-0 min-[900px]:h-dvh min-[900px]:flex-col min-[900px]:justify-start',
          'min-[900px]:gap-2 min-[900px]:border-t-0 min-[900px]:border-r-4 min-[900px]:p-4',
        )}
      >
        <p className="mb-6 hidden font-pixel text-xs text-(--color-accent) min-[900px]:block" aria-hidden="true">
          &gt; lantern<span className="cursor" />
        </p>
        {TABS.map(({ route: tab, label, Icon }) => {
          const active = current === tab.name;
          return (
            <a
              key={tab.name}
              href={href(tab)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-12 min-w-20 flex-col items-center justify-center gap-1 px-3 font-pixel text-[0.625rem] uppercase',
                'text-muted-foreground no-underline hover:text-foreground',
                'min-[900px]:flex-row min-[900px]:justify-start min-[900px]:gap-3 min-[900px]:text-xs',
                active && 'bg-secondary text-foreground',
              )}
            >
              <Icon aria-hidden="true" className={cn('size-5', active && 'text-(--color-accent)')} />
              {label}
            </a>
          );
        })}
      </nav>
      <main
        className={cn(
          'mx-auto w-full max-w-(--shell-max) px-4 pt-[calc(env(safe-area-inset-top)+20px)]',
          'pb-[calc(env(safe-area-inset-bottom)+112px)] min-[900px]:pb-12',
        )}
      >
        {children}
      </main>
    </div>
  );
}

/** A page title with the terminal cursor, and an optional line under it. */
export function PageHead({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <header className="mb-6">
      <h1 className="cursor font-pixel text-base leading-relaxed text-foreground">{title}</h1>
      {sub ? <p className="mt-1 text-sm text-muted-foreground">{sub}</p> : null}
    </header>
  );
}
