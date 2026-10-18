// The Czen icon set — drawn for this app, not a font.
//
// Grammar (so every glyph reads as one family):
//   • 24×24 grid, ~2px live-area padding, optical centre on (12,12)
//   • one stroke weight (set in Icon.tsx), round caps + round joins
//   • corners radius ≥1, no hairlines, no mixed fill/outline styles
//   • `body` parts are the glyph's main silhouette — tinted when the icon is
//     shown `active` (selected tab), giving a duotone "on" state instead of
//     swapping to an unrelated filled glyph like font sets do
//   • `dot` parts are small solid marks (pin centre, i-dot, headlights)
//
// Paths are hand-written on the grid; keep new glyphs to the same rules.

export type GlyphPart =
  // `solid`: filled shape (the *-fill tab variants). `evenodd` lets one path
  // carry its own knock-outs (door of the house, wallet clasp) so a filled
  // glyph keeps its inner detail instead of becoming a blob.
  | { d: string; body?: boolean; solid?: boolean; evenodd?: boolean }
  | { cx: number; cy: number; r: number; body?: boolean; dot?: boolean }

const circle = (cx: number, cy: number, r: number, extra: { body?: boolean; dot?: boolean } = {}): GlyphPart => ({ cx, cy, r, ...extra })

const defineGlyphs = <K extends string>(g: Record<K, GlyphPart[]>) => g

export const GLYPHS = defineGlyphs({
  // ── Tabs: outline (idle) + drawn solid (selected) pairs ────────────
  // Solid variants are separate drawings, not the outline with a fill: the
  // inner detail is knocked out (evenodd) so they stay legible at 24pt.
  home: [
    { d: 'M3.8 10.4 11.1 4.3a1.4 1.4 0 0 1 1.8 0l7.3 6.1a1.5 1.5 0 0 1 .5 1.1v7.6a1.9 1.9 0 0 1-1.9 1.9h-3.3a.9.9 0 0 1-.9-.9v-4.4a1.1 1.1 0 0 0-1.1-1.1h-3a1.1 1.1 0 0 0-1.1 1.1v4.4a.9.9 0 0 1-.9.9H5.2a1.9 1.9 0 0 1-1.9-1.9v-7.6a1.5 1.5 0 0 1 .5-1.1Z' },
  ],
  'home-fill': [
    { d: 'M3.8 10.4 11.1 4.3a1.4 1.4 0 0 1 1.8 0l7.3 6.1a1.5 1.5 0 0 1 .5 1.1v7.6a1.9 1.9 0 0 1-1.9 1.9h-3.3a.9.9 0 0 1-.9-.9v-4.4a1.1 1.1 0 0 0-1.1-1.1h-3a1.1 1.1 0 0 0-1.1 1.1v4.4a.9.9 0 0 1-.9.9H5.2a1.9 1.9 0 0 1-1.9-1.9v-7.6a1.5 1.5 0 0 1 .5-1.1Z', solid: true },
  ],
  wheel: [
    circle(12, 12, 8.6),
    circle(12, 12, 2.5),
    { d: 'M3.5 12h6' },
    { d: 'M14.5 12h6' },
    { d: 'M12 14.5v6' },
  ],
  'wheel-fill': [
    // rim: two concentric circles, evenodd → ring
    { d: 'M12 2.4a9.6 9.6 0 1 1 0 19.2 9.6 9.6 0 0 1 0-19.2Zm0 2.4a7.2 7.2 0 1 0 0 14.4 7.2 7.2 0 0 0 0-14.4Z', solid: true, evenodd: true },
    circle(12, 12, 3.3, { dot: true }),
    { d: 'M3.6 10.7h6.2v2.6H3.6Z', solid: true },
    { d: 'M14.2 10.7h6.2v2.6h-6.2Z', solid: true },
    { d: 'M10.7 14.2h2.6v6.2h-2.6Z', solid: true },
  ],
  purse: [
    { d: 'M6.2 6.6h12.3a2 2 0 0 1 2 2v9.4a2.4 2.4 0 0 1-2.4 2.4H6a2.5 2.5 0 0 1-2.5-2.5V8.4' },
    { d: 'M3.5 8.4a1.9 1.9 0 0 1 1.9-1.9L15.1 4a1.3 1.3 0 0 1 1.6 1.3v1.3' },
    { d: 'M20.5 11h-3.6a2.3 2.3 0 0 0 0 4.6h3.6' },
    circle(17, 13.3, 0.9, { dot: true }),
  ],
  'purse-fill': [
    { d: 'M5.1 6.1 15 3.5a1.8 1.8 0 0 1 2.2 1.7V6H5.4l-.3.1Z', solid: true },
    {
      d: 'M3.2 8.5A2.1 2.1 0 0 1 5.3 6.6h13.2a2.2 2.2 0 0 1 2.2 2.2v1.6h-3.8a2.9 2.9 0 0 0 0 5.8h3.8v1.8a2.6 2.6 0 0 1-2.6 2.6H5.9a2.7 2.7 0 0 1-2.7-2.7V8.5Zm13.8 3.7a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z',
      solid: true,
      evenodd: true,
    },
    { d: 'M20.7 11.6v3.4h-3.8a1.7 1.7 0 0 1 0-3.4h3.8Z', solid: true },
  ],
  person: [
    circle(12, 7.9, 3.7),
    { d: 'M4.9 19.1c.5-3.2 3.4-5.4 7.1-5.4s6.6 2.2 7.1 5.4a1.2 1.2 0 0 1-1.2 1.4H6.1a1.2 1.2 0 0 1-1.2-1.4Z' },
  ],
  'person-fill': [
    circle(12, 7.9, 4, { dot: true }),
    { d: 'M4.6 19c.5-3.4 3.5-5.8 7.4-5.8s6.9 2.4 7.4 5.8a1.4 1.4 0 0 1-1.4 1.6H6a1.4 1.4 0 0 1-1.4-1.6Z', solid: true },
  ],

  // ── Legacy tab glyphs (still used inline: map overlay, profile rows) ─
  map: [
    { d: 'M9 4.5 3.5 6.6v13l5.5-2.1 6 2.1 5.5-2.1v-13L15 6.6 9 4.5Z', body: true },
    { d: 'M9 4.5v13' },
    { d: 'M15 6.6v13' },
  ],
  car: [
    { d: 'M4.5 11.2h15a1.5 1.5 0 0 1 1.5 1.5v3.6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.3v-3.6a1.5 1.5 0 0 1 1.5-1.5Z', body: true },
    { d: 'm5.2 11.2 1.5-4.1a2 2 0 0 1 1.9-1.3h6.8a2 2 0 0 1 1.9 1.3l1.5 4.1' },
    { d: 'M6.5 17.8v1.7' },
    { d: 'M17.5 17.8v1.7' },
    circle(7.2, 14.5, 1.05, { dot: true }),
    circle(16.8, 14.5, 1.05, { dot: true }),
  ],
  wallet: [
    { d: 'M4 7.5V17a2 2 0 0 0 2 2h13a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 5.5', body: true },
    { d: 'M4 7.5V5.5A1.5 1.5 0 0 1 5.5 4h10.8a.7.7 0 0 1 .7.7V8' },
    circle(16.3, 13.5, 1.15, { dot: true }),
  ],
  profile: [
    circle(12, 8.3, 3.6, { body: true }),
    { d: 'M5 19.6c.9-3.4 3.7-5.6 7-5.6s6.1 2.2 7 5.6a.6.6 0 0 1-.6.8H5.6a.6.6 0 0 1-.6-.8Z', body: true },
  ],

  // ── Navigation chrome ───────────────────────────────────────────────
  'chevron-left': [{ d: 'm14.5 5.8-6.2 6.2 6.2 6.2' }],
  'chevron-right': [{ d: 'm9.5 5.8 6.2 6.2-6.2 6.2' }],
  'chevron-down': [{ d: 'm5.8 9.5 6.2 6.2 6.2-6.2' }],
  'chevron-up': [{ d: 'm5.8 14.5 6.2-6.2 6.2 6.2' }],
  'arrow-left': [{ d: 'M19 12H5.5' }, { d: 'm11 6-6 6 6 6' }],
  close: [{ d: 'm6.5 6.5 11 11' }, { d: 'm17.5 6.5-11 11' }],
  'close-circle': [circle(12, 12, 9, { body: true }), { d: 'm9.3 9.3 5.4 5.4' }, { d: 'm14.7 9.3-5.4 5.4' }],
  plus: [{ d: 'M12 5.5v13' }, { d: 'M5.5 12h13' }],
  check: [{ d: 'm5 12.6 4.5 4.4L19 7.4' }],
  'check-circle': [circle(12, 12, 9, { body: true }), { d: 'm8.2 12.3 2.6 2.6 5-5.3' }],
  search: [circle(10.8, 10.8, 6.3, { body: true }), { d: 'm15.5 15.5 4 4' }],
  send: [
    { d: 'M4.3 10.9 19 4.5a.6.6 0 0 1 .8.8l-6.4 14.6a.6.6 0 0 1-1.1-.1l-1.7-6.1-6.2-1.7a.6.6 0 0 1-.1-1.1Z', body: true },
    { d: 'm10.6 13.7 4.2-4.2' },
  ],
  eye: [
    { d: 'M2.8 12C4.7 8 8 5.8 12 5.8s7.3 2.2 9.2 6.2c-1.9 4-5.2 6.2-9.2 6.2S4.7 16 2.8 12Z', body: true },
    circle(12, 12, 2.8),
  ],
  'eye-off': [
    { d: 'M9.9 6a9 9 0 0 1 2.1-.2c4 0 7.3 2.2 9.2 6.2a12 12 0 0 1-2.4 3.4M6.4 7.4A11.6 11.6 0 0 0 2.8 12c1.9 4 5.2 6.2 9.2 6.2 1.7 0 3.2-.4 4.6-1.2' },
    { d: 'M10 10a2.8 2.8 0 0 0 4 4' },
    { d: 'm4 4 16 16' },
  ],
  refresh: [{ d: 'M19.5 12a7.5 7.5 0 1 1-2.2-5.3' }, { d: 'M19.6 4.6v4.1h-4.1' }],

  // ── Map & trip ──────────────────────────────────────────────────────
  locate: [
    circle(12, 12, 6.5, { body: true }),
    circle(12, 12, 2.2, { dot: true }),
    { d: 'M12 2.8v2.7M12 18.5v2.7M2.8 12h2.7M18.5 12h2.7' },
  ],
  navigate: [{ d: 'M12 3.5 19 20l-7-3.9L5 20l7-16.5Z', body: true }],
  pin: [
    { d: 'M12 21.2s-6.6-5.7-6.6-11.2a6.6 6.6 0 0 1 13.2 0c0 5.5-6.6 11.2-6.6 11.2Z', body: true },
    circle(12, 10, 2.4),
  ],
  flag: [{ d: 'M5.5 21V4.2' }, { d: 'M5.5 4.5h11.3a.5.5 0 0 1 .4.8l-2.4 3.7 2.4 3.7a.5.5 0 0 1-.4.8H5.5', body: true }],
  distance: [
    circle(6, 18, 2.2, { body: true }),
    circle(18, 6, 2.2, { body: true }),
    { d: 'M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8' },
  ],
  route: [
    circle(6, 19, 1.9, { dot: true }),
    circle(18, 5, 1.9, { body: true }),
    { d: 'M6 16.9V9.3a3.3 3.3 0 0 1 6.6 0v5.4a3.3 3.3 0 0 0 6.6 0V7.4' },
  ],
  clock: [circle(12, 12, 8.6, { body: true }), { d: 'M12 7.6V12l2.9 1.9' }],
  calendar: [
    { d: 'M5.2 6.2h13.6a1.7 1.7 0 0 1 1.7 1.7v10.9a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.9a1.7 1.7 0 0 1 1.7-1.7Z', body: true },
    { d: 'M3.5 10.4h17' },
    { d: 'M8 3.8v4' },
    { d: 'M16 3.8v4' },
  ],
  phone: [
    {
      d: 'M8.4 3.8 6.3 4A1.9 1.9 0 0 0 4.6 6c.4 7.3 6.1 13 13.4 13.4a1.9 1.9 0 0 0 2-1.7l.2-2.1a1 1 0 0 0-.7-1.1l-3.2-1a1 1 0 0 0-1.1.4l-1.1 1.6a12.2 12.2 0 0 1-4.6-4.6L11 9.8a1 1 0 0 0 .4-1.1l-1-3.2a1 1 0 0 0-1-.7Z',
      body: true,
    },
  ],
  customer: [
    circle(12, 12, 9, { body: true }),
    circle(12, 10, 3),
    { d: 'M6.6 18.3c1.2-2 3.1-3.2 5.4-3.2s4.2 1.2 5.4 3.2' },
  ],

  // ── Turn-by-turn ────────────────────────────────────────────────────
  'turn-left': [{ d: 'M17 20.5v-8a3.5 3.5 0 0 0-3.5-3.5H6' }, { d: 'M9.6 5.4 6 9l3.6 3.6' }],
  'turn-right': [{ d: 'M7 20.5v-8A3.5 3.5 0 0 1 10.5 9H18' }, { d: 'M14.4 5.4 18 9l-3.6 3.6' }],
  straight: [{ d: 'M12 20.5V5' }, { d: 'M6.6 10.4 12 5l5.4 5.4' }],
  uturn: [{ d: 'M7.5 20.5V10a4.25 4.25 0 0 1 8.5 0v6.5' }, { d: 'm12.7 13.3 3.3 3.3 3.3-3.3' }],
  roundabout: [{ d: 'M12 21v-6.6' }, { d: 'M9.2 13.4a4.6 4.6 0 1 1 5.6 0' }, { d: 'M14.6 10.4v3.2h3.2' }],
  merge: [{ d: 'M7 3.8v4.6a4 4 0 0 0 1.2 2.8L12 15v5.5' }, { d: 'M17 3.8v4.6a4 4 0 0 1-1.2 2.8l-2.2 2.2' }],

  // ── Status ──────────────────────────────────────────────────────────
  warning: [
    { d: 'M10.3 4.4a2 2 0 0 1 3.4 0l7.3 12.8a2 2 0 0 1-1.7 3H4.7a2 2 0 0 1-1.7-3l7.3-12.8Z', body: true },
    { d: 'M12 9.6v3.9' },
    circle(12, 16.7, 1.05, { dot: true }),
  ],
  'alert-circle': [circle(12, 12, 9, { body: true }), { d: 'M12 7.6v5.2' }, circle(12, 16.2, 1.05, { dot: true })],
  info: [circle(12, 12, 9, { body: true }), { d: 'M12 11.2v5.2' }, circle(12, 7.9, 1.05, { dot: true })],
  help: [
    circle(12, 12, 9, { body: true }),
    { d: 'M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.1-2.4 3.6' },
    circle(12, 16.9, 1.05, { dot: true }),
  ],
  star: [{ d: 'm12 3.9 2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8L12 3.9Z', body: true }],
  chart: [
    { d: 'M6.5 11h1a1 1 0 0 1 1 1v6.5h-3V12a1 1 0 0 1 1-1Z', body: true },
    { d: 'M11.5 5.5h1a1 1 0 0 1 1 1v12h-3v-12a1 1 0 0 1 1-1Z', body: true },
    { d: 'M16.5 8.5h1a1 1 0 0 1 1 1v9h-3v-9a1 1 0 0 1 1-1Z', body: true },
    { d: 'M4 18.5h16' },
  ],
  'thumbs-up': [
    { d: 'M4.6 10.4h2.9v9.1H4.6a1 1 0 0 1-1-1v-7.1a1 1 0 0 1 1-1Z', body: true },
    { d: 'm7.5 10.4 3.3-6.1a1.6 1.6 0 0 1 3 1l-.6 3.8h4.6a2 2 0 0 1 2 2.3l-1.1 6.4a2 2 0 0 1-2 1.7H7.5' },
  ],

  // ── Account & settings ──────────────────────────────────────────────
  edit: [{ d: 'm4.6 19.4.8-3.8L15.7 5.3a2.1 2.1 0 0 1 3 3L8.4 18.6l-3.8.8Z', body: true }, { d: 'm13.9 7.1 3 3' }],
  card: [
    { d: 'M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z', body: true },
    { d: 'M2.5 9.6h19' },
    { d: 'M6.2 15h3' },
  ],
  document: [
    { d: 'M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z', body: true },
    { d: 'M13.5 3.6v4.9h4.9' },
  ],
  'document-text': [
    { d: 'M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z', body: true },
    { d: 'M13.5 3.6v4.9h4.9' },
    { d: 'M8.6 12.6h6.8' },
    { d: 'M8.6 16.2h4.6' },
  ],
  'document-upload': [
    { d: 'M6.6 3.5h6.9L18.5 8.5v10.4a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 18.9V5.1a1.6 1.6 0 0 1 1.6-1.6Z', body: true },
    { d: 'M13.5 3.6v4.9h4.9' },
    { d: 'M12 17.2v-5.4' },
    { d: 'm9.6 14 2.4-2.4 2.4 2.4' },
  ],
  'shield-check': [
    { d: 'M12 3.4 19 6v5.6c0 4.3-2.9 7.8-7 9-4.1-1.2-7-4.7-7-9V6l7-2.6Z', body: true },
    { d: 'm8.8 12.1 2.2 2.2 4.2-4.3' },
  ],
  support: [
    { d: 'M4.6 14v-2a7.4 7.4 0 0 1 14.8 0v2' },
    { d: 'M4.6 13.4h1.6a1 1 0 0 1 1 1v3.2a1 1 0 0 1-1 1h-.6a1 1 0 0 1-1-1v-4.2Z', body: true },
    { d: 'M19.4 13.4h-1.6a1 1 0 0 0-1 1v3.2a1 1 0 0 0 1 1h.6a1 1 0 0 0 1-1v-4.2Z', body: true },
    { d: 'M18.9 18.6c0 1.3-1.5 2-3.4 2h-2.3' },
  ],
  mic: [
    { d: 'M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3Z', body: true },
    { d: 'M6 11.2a6 6 0 0 0 12 0' },
    { d: 'M12 17.2v3.3' },
  ],
  logout: [
    { d: 'M13.8 4.5H7A1.5 1.5 0 0 0 5.5 6v12A1.5 1.5 0 0 0 7 19.5h6.8' },
    { d: 'M10.5 12h9.4' },
    { d: 'm16.4 8.5 3.5 3.5-3.5 3.5' },
  ],
  language: [
    circle(12, 12, 8.6, { body: true }),
    { d: 'M3.5 12h17' },
    { d: 'M12 3.4c2.2 2.3 3.3 5.2 3.3 8.6s-1.1 6.3-3.3 8.6c-2.2-2.3-3.3-5.2-3.3-8.6S9.8 5.7 12 3.4Z' },
  ],
  mail: [
    { d: 'M4.7 5.5h14.6A1.7 1.7 0 0 1 21 7.2v9.6a1.7 1.7 0 0 1-1.7 1.7H4.7A1.7 1.7 0 0 1 3 16.8V7.2a1.7 1.7 0 0 1 1.7-1.7Z', body: true },
    { d: 'm3.6 7.2 8.4 6 8.4-6' },
  ],
  moon: [{ d: 'M19.6 14.6A8 8 0 0 1 9.4 4.4a8 8 0 1 0 10.2 10.2Z', body: true }],
  power: [{ d: 'M12 3.5v8' }, { d: 'M7.1 6.6a7.2 7.2 0 1 0 9.8 0' }],
  'mic-off': [
    { d: 'M15 11.3V6.5a3 3 0 0 0-5.6-1.5M9 9v2.5a3 3 0 0 0 4.6 2.5' },
    { d: 'M6 11.2a6 6 0 0 0 9.7 4.7M18 11.2a6 6 0 0 1-.4 2.1' },
    { d: 'M12 17.2v3.3' },
    { d: 'm4 4 16 16' },
  ],
  dot: [circle(12, 12, 4, { dot: true })],
})

export type IconName = keyof typeof GLYPHS
