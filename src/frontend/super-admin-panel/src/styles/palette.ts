/**
 * Czen operations palette — shared by the dispatcher (admin-panel) and the
 * ops (super-admin-panel) consoles so both read as one product with the
 * driver app: deep navy-violet surfaces, violet accent, calm status colours.
 */
export const PALETTE = {
  // Brand
  darkest: '#1e1340',
  base:    '#6d3fe0',
  mid:     '#8b5cf6',
  light:   '#a78bfa',
  pale:    '#ede9fe',
  ink:     '#1f1a2e',
  gray:    '#8f89a6',
  border:  '#e6e1ee',
  surface: '#faf9fc',
  chipBg:  '#efe7f8',
  brandGradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 45%, #4c1d95 100%)',

  /** Authenticated shell (dark) */
  shellSidebar:  '#0f0c1c',
  shellContent:  '#0b0916',
  shellPanel:    '#141126',
  shellElevated: '#1b1731',
  shellStat:     '#141126',
  shellTableHead:'#17142b',
  shellBorder:   'rgba(167, 139, 250, 0.12)',
  shellBorderStrong: 'rgba(167, 139, 250, 0.22)',
  shellNavHover:  'rgba(167, 139, 250, 0.08)',
  shellNavActive: 'rgba(139, 92, 246, 0.18)',
  shellSearch:    '#17142b',
  shellMuted:     '#9a94b5',
  shellText:      '#d9d5ea',
  shellHeading:   '#f4f2fb',
  shellAccent:    '#8b5cf6',

  // Status
  success: '#34d399',
  warning: '#fbbf24',
  danger:  '#f87171',
  info:    '#60a5fa',
  codeBg:  '#07060d',
  up:      '#34d399',
  down:    '#f87171',
}
