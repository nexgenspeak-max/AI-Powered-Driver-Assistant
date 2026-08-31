/** Indent-based YAML subset: maps of scalars, used for locales/manifest.yaml. */
export function parseManifest(text: string): {
  default: string;
  locales: Record<string, Record<string, string>>;
} {
  const locales: Record<string, Record<string, string>> = {};
  let defaultLang = '';
  let currentLocale = '';

  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) {
      continue;
    }
    const indent = raw.length - raw.trimStart().length;
    const line = raw.trim();
    const colon = line.indexOf(':');
    if (colon < 0) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();

    if (indent === 0 && key === 'default') {
      defaultLang = value;
      continue;
    }
    if (indent === 0 && key === 'locales') {
      currentLocale = '';
      continue;
    }
    if (indent === 2 && !value) {
      currentLocale = key;
      locales[currentLocale] = {};
      continue;
    }
    if (indent >= 4 && currentLocale && value) {
      locales[currentLocale][key] = value;
    }
  }

  return { default: defaultLang, locales };
}
