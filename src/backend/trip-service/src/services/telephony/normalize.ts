/** E.164-ish normalization for outbound dial targets. */

export function normalizePhone(phone: string): string {
  let p = phone.trim().replace(/[\s\-()]/g, '');
  if (!p) return '';
  if (p.startsWith('00')) p = '+' + p.slice(2);
  const bare = p.replace(/^\+/, '');
  if (bare.startsWith('84')) return `+${bare}`;
  if (bare.startsWith('0') && bare.length >= 10) return `+84${bare.slice(1)}`;
  if (!p.startsWith('+')) return `+${bare}`;
  return p;
}
