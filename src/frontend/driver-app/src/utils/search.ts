/**
 * Accent-insensitive search for Vietnamese: drivers often type without
 * diacritics ("nguyen", "dang my linh"), so both sides are folded —
 * NFD + strip combining marks, đ/Đ → d, lower-case, collapsed spaces.
 */
export function foldVi(text: string | null | undefined): string {
  return (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** True when every word of `query` appears in any of `fields` (folded). */
export function matchesQuery(query: string, fields: (string | null | undefined)[]): boolean {
  const q = foldVi(query)
  if (!q) return true
  const hay = foldVi(fields.filter(Boolean).join(' '))
  return q.split(' ').every(word => hay.includes(word))
}
