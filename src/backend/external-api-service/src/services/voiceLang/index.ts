export type VoiceRoutingLang = 'vn' | 'en';

const SUPPORTED: ReadonlySet<string> = new Set(['vn', 'en']);

/** Default for driver inbound — VN-primary product. */
export const DEFAULT_VOICE_ROUTING_LANG: VoiceRoutingLang = 'vn';

/**
 * Normalize client/env lang to voice-agent routing code.
 * Invalid values return undefined (caller should default to vn).
 */
export function normalizeVoiceLang(raw: unknown): VoiceRoutingLang | undefined {
  if (typeof raw !== 'string') return undefined;
  const code = raw.trim().toLowerCase();
  if (code === 'vn' || code === 'vi') return 'vn';
  if (code === 'en') return 'en';
  return undefined;
}

/** Resolve lang for room metadata — never leaves routing unset. */
export function resolveVoiceRoutingLang(raw: unknown): VoiceRoutingLang {
  return normalizeVoiceLang(raw) ?? DEFAULT_VOICE_ROUTING_LANG;
}

export function isVoiceRoutingLang(raw: unknown): raw is VoiceRoutingLang {
  return typeof raw === 'string' && SUPPORTED.has(raw);
}
