/**
 * What a finished session is called when it is reported to HeartBeat.
 *
 * The server decides what each is worth and how much a day can add; this copy
 * exists so the screen can say "up to 20 XP" and "maxed for today" without a
 * round trip. If it drifts from HeartBeat the server is right and this is only
 * a caption. Source of truth: HeartBeat `app/src/domain/study/award.ts` and
 * `app/functions/api/study/session.ts`.
 */
export const XP_KINDS = ['deck', 'quiz', 'weekly', 'match', 'anatomy', 'typing'] as const;
export type XpKind = (typeof XP_KINDS)[number];

export const XP_VALUE: Record<XpKind, number> = {
  deck: 20,
  quiz: 25,
  weekly: 35,
  match: 10,
  anatomy: 15,
  typing: 15,
};

export const XP_DAILY_CAP = 120;

/**
 * Fewest cards a session must cover to be reported. HeartBeat pays per session
 * and stops at the daily cap, so without a floor six one-card sessions would
 * earn the whole day. This is Lantern's own rule, not HeartBeat's.
 */
export const MIN_CARDS_FOR_XP = 5;

/** Which kind each thing this app can finish is reported as. */
export const KIND_FOR = {
  review: 'deck',
  quiz: 'quiz',
  exam: 'weekly',
  matching: 'match',
  diagram: 'anatomy',
  // HeartBeat rejects kinds it does not know, so `battle` still borrows an existing one.
  // Change the value here, nowhere else, if it ever gets a kind of its own.
  study: 'deck',
  battle: 'match',
  // Needs HeartBeat's `typing` kind (app/functions/api/study/session.ts). A server that has not
  // got it answers 400 and the session is refused for good, so deploy HeartBeat first.
  typing: 'typing',
} as const satisfies Record<string, XpKind>;

export type SessionMode = keyof typeof KIND_FOR;

/** The id HeartBeat deduplicates on: 8–64 characters of `[A-Za-z0-9_-]`. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export function newSessionId(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return `ln_${[...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}
