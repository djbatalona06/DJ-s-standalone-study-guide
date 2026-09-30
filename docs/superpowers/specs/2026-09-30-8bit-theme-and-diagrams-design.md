# 8-bit terminal theme, the character, and the diagram engine

Status: built · 2026-09-30 · one slice, one PR

## Why

Phase 1 worked but looked like a first draft: system font, plain white cards,
a thin bar. Nothing made it an app you want to open every day. This slice
gives Lantern a look, a character to follow, and the first interactive
diagram (Phase 2's core), and it closes the Phase 1 gaps (onboarding, routes,
install).

## Decisions

| Question | Decision | Why |
|---|---|---|
| Next slice | Design pass and diagram engine together | The owner's call. |
| Look | HeartBeat's token names, darker, "terminal after dark" | Same family as HeartBeat, with its own mood. |
| Components | [8bitcn](https://www.8bitcn.com/) installed for real: Tailwind v4 + shadcn/ui + Radix | The owner's call. This diverges from HeartBeat's `docs/TAILWIND.md`, but shadcn themes through CSS variables, so every colour still comes from one token list (see TRD §1). |
| Character | One original 16×16 hacker sprite, **named by the learner** | No name is hard-coded anywhere. He grows through the career stages as the Path screen arrives. |

## What was built

### Theme
- `src/theme/palette.ts` holds both palettes in HeartBeat's names (`base`,
  `surface`, `text`, `accent`, …) plus `xp` (lantern amber). `styles.css`
  paints the same values, and shadcn's variables (`--background`,
  `--primary`, `--ring`, …) point at them.
- `src/theme/contrast.test.ts` fails if a text pair drops below 4.5:1, a UI
  pair below 3:1, pure black or white appears, or the CSS drifts from the
  palette file.
- The pixel face (Press Start 2P) is for titles, numbers and buttons. Body text
  is Outfit (HeartBeat's). Both are bundled: no request to Google, works
  offline.
- There is a faint static scanline in dark mode and a blinking cursor after page titles.
  `prefers-reduced-motion` stops all motion.

### The character
- `src/art/sprites.ts`: rows of text in HeartBeat's sprite format. The palette
  names roles (`o` outline, `m` mid, `l` light, `a` accent), resolved to CSS
  variables so he recolours with the theme. There are two frames for the typing idle.
- `src/art/Sprite.tsx` draws runs of pixels as SVG rects (crisp at any size,
  `role="img"`).
- `settings.characterName` is typed at onboarding and editable in Me. A backup
  carries it to a device that has not named him yet, and never renames one
  that has.
- Stages: Foundations → Help desk → Specialize → Sysadmin → Cloud. Only
  Foundations is drawn; the rest arrive with Path (Phase 4).

### Shell and daily loop
- Hash routes (`src/app/route.ts`) with no router dependency.
- Tabs are Today · Learn · Me. Practice and Path will be added when they have content.
- Onboarding: name, tracks, optional HeartBeat link.
- Today shows a greeting with the name, a streak (`domain/streak.ts`, never
  guilt: a broken streak is just "Day 1"), one primary review button, readiness
  bars with numbers, the diagram, and the XP bar when linked.
- Review shows the next interval on each grade button (`domain/srs/preview.ts`).

### Diagram engine
- `Diagram` (names, cards, text alternative) is in the main bundle. `DiagramArt`
  (geometry) is a lazy `diagram-*.js` chunk, so the list view still works if
  the art fails to load.
- Motherboard: 15 parts, each with an original A+ Core 1 card.
- `validateDiagram` checks for unique ids and labels, that every part's card exists in
  the diagram's domain, that the text alternative is present, and that every part
  has a shape inside the 100×100 space.
- Viewer: Explore opens the card in a drawer. Label is tap a name, tap a part,
  then check. List view is on `L`. The parts are one Tab stop and the arrow keys move
  between them; focus returns to the part when the drawer closes.
- XP: exploring 5+ parts queues `anatomy`, and a checked labelling queues `match`.

## Left for later

- Match mode (term to part). Label already earns the `match` kind.
- More diagrams (RAM keying next), then the rest of Core 1.
- Help desk, Sysadmin and Cloud sprites.
- The shadcn CLI could not reach `ui.shadcn.com` or `8bitcn.com` from the
  build environment, so the components were copied from 8bitcn's MIT source.
  On a normal machine, `npx shadcn add @8bitcn/<name>` works with the
  `components.json` in the repo.

## Verification (at merge time)

- typecheck, 132 unit tests, build. Initial JS is about 120 kB gzip (budget 150).
- axe-core: no violations on any screen, dark and light.
- Keyboard walk of the diagram: Tab in, arrows, Enter, Escape returns focus, Tab
  out, `L`.
