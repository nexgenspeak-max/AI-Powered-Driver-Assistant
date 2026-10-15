/** Canonical log line. Callers pass facts; this module owns the shape. */

export type LogFields = Record<string, unknown>;

const MAX_VALUE = 240;

// Vietnamese phone numbers (0xxxxxxxxx, 84xxxxxxxxx, +84xxxxxxxxx). Every log line
// passes through formatLine, so masking here covers all call sites (NFR-05).
const PHONE_RE = /(?<!\d)(\+?84|0)(\d{3})\d{3}(\d{3})(?!\d)/g;

/** 0888123798 -> 0888xxx798; keeps enough digits to tell sessions apart. */
export function maskPhones(text: string): string {
  return text.replace(PHONE_RE, (_m, cc: string, head: string, tail: string) => `${cc}${head}xxx${tail}`);
}

export function fmtValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (Number.isInteger(value) || Math.abs(value) >= 10) {
      return String(Math.round(value));
    }
    return value.toFixed(2);
  }
  const text = String(value).replace(/[\n\r]+/g, ' ').trim();
  const clipped = text.length > MAX_VALUE ? `${text.slice(0, MAX_VALUE)}…` : text;
  if (!clipped) {
    return '-';
  }
  if (/[\s="]/.test(clipped)) {
    return `"${clipped.replace(/"/g, "'")}"`;
  }
  return clipped;
}

export function formatLine(opts: {
  ts: string;
  level: string;
  service: string;
  fn: string;
  room: string;
  conv: string;
  msg: string;
  fields?: LogFields;
}): string {
  const prefix =
    `${opts.ts} ${opts.level} ${opts.service} ${opts.fn} ` +
    `room=${fmtValue(opts.room || '-')} conv=${fmtValue(opts.conv || '-')}`;
  const body = (opts.msg || '').trim();
  const extras: string[] = [];
  if (opts.fields) {
    for (const [key, value] of Object.entries(opts.fields)) {
      if (value === null || value === undefined || value === '') {
        continue;
      }
      extras.push(`${key}=${fmtValue(value)}`);
    }
  }
  if (body && extras.length) {
    return maskPhones(`${prefix} — ${body} ${extras.join(' ')}`);
  }
  if (body) {
    return maskPhones(`${prefix} — ${body}`);
  }
  if (extras.length) {
    return maskPhones(`${prefix} — ${extras.join(' ')}`);
  }
  return maskPhones(prefix);
}
