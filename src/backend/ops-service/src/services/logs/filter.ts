export interface LogFilter {
  room?: string;
  conv?: string;
  /** Free text, case-insensitive. */
  q?: string;
}

function clean(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Same semantics as `grep 'room=driver-088'` on the canonical line: room and
 * conv match as a prefix of the `room=` / `conv=` value, q anywhere in the line.
 */
export function lineMatches(line: string, filter: LogFilter): boolean {
  const room = clean(filter.room);
  if (room && !line.includes(`room=${room}`)) {
    return false;
  }
  const conv = clean(filter.conv);
  if (conv && !line.includes(`conv=${conv}`)) {
    return false;
  }
  const q = clean(filter.q).toLowerCase();
  if (q && !line.toLowerCase().includes(q)) {
    return false;
  }
  return true;
}

export function filterTerms(filter: LogFilter): string[] {
  const terms: string[] = [];
  const room = clean(filter.room);
  if (room) terms.push(`room=${room}`);
  const conv = clean(filter.conv);
  if (conv) terms.push(`conv=${conv}`);
  const q = clean(filter.q);
  if (q) terms.push(q);
  return terms;
}
