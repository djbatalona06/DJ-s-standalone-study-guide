export function id(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
