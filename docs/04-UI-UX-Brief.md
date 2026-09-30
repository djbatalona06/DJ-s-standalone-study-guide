# 04 — UI/UX Brief: Lantern

## 1. Principles

1. **Same family as HeartBeat.** Reuse its design system (`HeartBeat/docs/design-system.md`), theme packs, and calm mode so the two apps read as one product. The study app adds a *study* mood, not a new brand.
2. **Calm, not gamified-loud.** XP exists but is quiet: one small number, never confetti-every-tap. The first job is comprehension.
3. **Mobile first**, one-thumb reach for grading and answering; desktop gets a two-pane layout.
4. **Accessible by default.** Nothing is only visual, only color, or only drag.
5. **Explain, don't just grade.** Every wrong answer ends on an explanation the user can act on.

## 2. Look and feel

- Surfaces, spacing, radii and type scale: HeartBeat tokens. Do not invent a second palette.
- Light and dark from the theme engine; colors come from CSS variables so diagrams recolor with the theme.
- Density: comfortable on phone (48 px minimum touch targets), compact on desktop.
- Motion: short (≤ 200 ms) reveals and slides. Everything animated has a `prefers-reduced-motion` and calm-mode static equivalent.
- Illustration: original SVG only (see the TRD). Style: flat shapes, 2 px outlines, one accent per diagram, labels in the UI font.

### 2a. The 8-bit terminal theme

- **Components:** [8bitcn/ui](https://www.8bitcn.com/) ([source](https://github.com/TheOrcDev/8bitcn-ui), MIT), a retro set built on shadcn/ui. The copies live in `src/components/ui/8bit/`, so we own and edit them.
- **Mood:** HeartBeat's token names, a shade darker: "terminal after dark". The base is near-black green, surfaces are dark green, the accent is phosphor green, and **lantern amber is kept for XP**. The light palette is the same room with the lights on. No pure black or white.
- **Type:** Press Start 2P (the pixel face) for page titles, section labels, numbers and buttons. Outfit (HeartBeat's body face) for everything you read. Never set a paragraph in the pixel face.
- **Texture:** stepped pixel borders on cards, bars and buttons (8bitcn). A faint static scanline over the dark palette. A blinking `_` cursor after page titles, stopped by reduced motion.
- **Guardrail:** colours live in `src/theme/palette.ts`; `contrast.test.ts` checks every text pair (4.5:1) and UI pair (3:1) in both modes, and that `styles.css` matches.

### 2b. The character

- One original 8-bit character: a hacker working his way through the roles, from help desk to sysadmin to cloud. **The learner names him** at onboarding (Me can rename him). Nothing in the code or the copy gives him a default name.
- Drawn in code as a 16×16 grid of role characters (`src/art/sprites.ts`, HeartBeat's sprite format), so he recolours with the theme and there is no image to license.
- **Stages** follow the career path: Foundations (hoodie, laptop) → Help desk (headset) → Specialize → Sysadmin → Cloud. Only Foundations is drawn so far; the others come with the Path screen.
- **Where he appears:** onboarding, the Today header (greeting, level, stage), the end of a review, empty states. He idles (typing) but never cheers on every tap: XP stays quiet (§1).

## 3. Key components

| Component | Notes |
|---|---|
| Card | Front/back, flip by tap or Space; image slot above text; domain chip; "sources" foot link. |
| Grade bar | Four buttons (Again/Hard/Good/Easy) with the next-interval preview ("10 min", "3 d"). Thumb-reachable, fixed at bottom. |
| Domain ring | Mastery as a ring **plus a number** (never color alone). |
| Diagram viewer | Pinch/zoom, pan; parts are buttons with focus ring; part label appears on focus/hover/tap. |
| Label tray | Names as chips; selected chip highlighted; parts show a drop target outline. Tap-to-place is the primary interaction, drag is optional. |
| Question view | One question per screen. Multi-select shows "Select 2". Ordering uses up/down buttons in addition to drag. |
| Exam header | Timer (mm:ss), progress "37/90", flag toggle. Timer is `role="timer"` but announced only every 5 minutes and at 5 and 1 minute left. |
| Readiness bar | Per domain, ticks at the official weights, threshold line at 85%. |
| Path node | Icon by type, status badge, prerequisite chips, hours. |
| Toast | Non-blocking; used for XP credited, queued, needs-reconnect. |

## 4. Exam mode look

- Chrome removed: hide the tab bar, show only the exam header. A confirm dialog guards Exit.
- Neutral, low-stimulation palette; no streak or XP visible during the exam.
- The review screen is a grid of numbered squares: answered, flagged, unanswered (distinguished by icon and pattern as well as color).
- After submit, colors return, plus the per-domain breakdown.

## 5. Diagram accessibility

- Every interactive part is a `<button>` or has `role="button"`, `tabindex="0"`, an `aria-label` ("Northbridge, chip"), and a visible focus ring (≥ 3:1 contrast against both the part and the background).
- Arrow keys move between parts in a defined order; Tab enters and leaves the diagram as one stop.
- **Every diagram has a list view** (an ordered list of parts with descriptions). It is the screen-reader path and the fallback when SVG fails.
- Label and Match work fully by keyboard: select a name, select a part, press Enter.
- Color is never the only signal: correct/incorrect use an icon and text.
- Diagram `<svg>` has `role="img"` and a `<title>`/`<desc>` when non-interactive.
- Zoom must not trap scroll; provide +/− buttons.

## 6. Empty, error and loading states

| Screen | Empty | Error | Loading |
|---|---|---|---|
| Today | "Nothing due. Try a diagram or a 10-question quiz." | n/a (local) | skeleton cards |
| Review | "You are done for today." with next due time | n/a | none |
| Diagram | n/a | list-view fallback + "Diagram could not load" | outline skeleton |
| Practice | "No questions in this domain yet." (dev-visible count) | n/a | none |
| Path | n/a | n/a | none |
| HeartBeat link | "Not linked. Study still works." | "Link was revoked. Reconnect." | inline spinner on send |
| Import | "Choose a file" | "This file is not a Lantern backup" with specific reason | progress |

## 7. Copy voice

Plain and direct, second person, no exam-prep hype. Wrong answers: "Not quite. The trick is …" Never shame, never streak-guilt. Use "maxed for today" not "limit reached".

## 8. Responsive behavior

- ≤ 480 px: single column, bottom tabs.
- 481–900 px: single column, wider cards.
- ≥ 900 px: left rail navigation; diagram viewer on the left, active card on the right.
- Supports installed-PWA standalone display and safe-area insets.

## 9. Acceptance checks (per screen)

- Keyboard-only walk works with no trap.
- axe reports no serious or critical issues in light, dark and calm mode.
- Text contrast ≥ 4.5:1 (3:1 for large text and UI parts).
- 200% text zoom does not clip or scroll horizontally.
- Screen reader announces the timer, the question number, and the result of each answer.
