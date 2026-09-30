# Notice

Lantern is a personal, non-commercial study app. This file lists what it is
built from that is not its own.

## Artwork

**No third-party artwork is used.** Every graphic is drawn in code:

- The character in `src/art/sprites.ts` is a sixteen-by-sixteen grid of
  characters, written by hand in the same format as HeartBeat's
  `domain/rpg/sprites.ts`, and rendered as SVG rectangles. No sprite sheet or
  image file is loaded.
- The motherboard in `src/content/diagrams/` is rectangles and paths in a
  100×100 space. It is a generic ATX layout, not any manufacturer's board.
- `public/icon.svg` is hand-written SVG.

## Content

Cards are original wording. CompTIA's A+ objectives are used as an outline
(domain names, topic lists), never as text. CS50 (CC BY-NC-SA 4.0) is linked,
not copied. Every card carries a `provenance` field.

## Third-party code

| Dependency | Licence | Notes |
|---|---|---|
| [8bitcn/ui](https://www.8bitcn.com/) ([source](https://github.com/TheOrcDev/8bitcn-ui)) | MIT, see `src/components/ui/8bit/LICENSE.md` | Component source copied into `src/components/ui/8bit/`, lightly edited (theme tokens instead of fixed colours, no remote font import). |
| [shadcn/ui](https://ui.shadcn.com/) | MIT | Base components in `src/components/ui/`, as 8bitcn ships them. |
| [Radix UI](https://www.radix-ui.com/) | MIT | Dialog, progress, switch, slot. |
| [Tailwind CSS](https://tailwindcss.com/) | MIT | |
| [Lucide](https://lucide.dev/) | ISC | Icons. |
| class-variance-authority, clsx, tailwind-merge | Apache-2.0 / MIT / MIT | |
| React, Vite, Dexie, Vitest, vite-plugin-pwa, Workbox | MIT | |
| [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) | SIL Open Font License 1.1 | Bundled via `@fontsource`. |
| [Outfit](https://fonts.google.com/specimen/Outfit) | SIL Open Font License 1.1 | Bundled via `@fontsource-variable`. HeartBeat's body face. |
