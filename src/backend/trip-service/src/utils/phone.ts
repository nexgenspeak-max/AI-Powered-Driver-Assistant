// Driver/customer phone numbers aren't stored on trips in one consistent
// format (some rows have `+84...`, some bare digits, some a leading `0`),
// so any lookup keyed by phone has to union results across the variants a
// given input could be stored as, not just query the exact string received.
// Centralized here — this list was previously duplicated (and drifting;
// drivers.ts's version didn't handle the 84/0 prefix swap this one does)
// across drivers.ts and driverContextService.ts.
export function phoneVariants(phone: string): string[] {
  const p = phone.trim();
  const bare = p.replace(/^\+/, '');
  const variants = [p, bare, `+${bare}`];
  if (bare.startsWith('84')) variants.push(`0${bare.slice(2)}`);
  if (bare.startsWith('0')) variants.push(`+84${bare.slice(1)}`);
  return [...new Set(variants)];
}
