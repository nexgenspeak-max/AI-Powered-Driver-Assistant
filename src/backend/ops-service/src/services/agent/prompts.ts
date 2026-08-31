import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative } from 'path';

export type PromptFile = {
  path: string;
  locale: string;
  bytes: number;
  mtime: string;
  text: string;
};

const MAX_TEXT = 120_000;

const LOCALE_PROMPT_FILES = [
  'tools_definition.py',
  'system_instructions.py',
  'tools_mapping.py',
  'agent.py',
  'constants.py',
  'pronunciations.py',
];

function listFiles(dir: string, pred: (name: string) => boolean): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => pred(name))
    .map((name) => join(dir, name));
}

function toPrompt(root: string, abs: string, locale: string, includeText: boolean): PromptFile | null {
  try {
    const st = statSync(abs);
    if (!st.isFile()) {
      return null;
    }
    let text = '';
    if (includeText) {
      const raw = readFileSync(abs, 'utf8');
      text = raw.length > MAX_TEXT ? `${raw.slice(0, MAX_TEXT)}\n…` : raw;
    }
    return {
      path: relative(root, abs).replace(/\\/g, '/'),
      locale,
      bytes: st.size,
      mtime: st.mtime.toISOString(),
      text,
    };
  } catch {
    return null;
  }
}

/** Locale dirs that look like voice bundles (not python packages only). */
export function listLocaleIds(localesDir: string): string[] {
  if (!existsSync(localesDir)) {
    return [];
  }
  return readdirSync(localesDir, { withFileTypes: true })
    .filter((ent) => ent.isDirectory() && !ent.name.startsWith('_') && ent.name !== 'yaml')
    .map((ent) => ent.name)
    .filter((id) => existsSync(join(localesDir, id, 'tools')) || existsSync(join(localesDir, id, 'yaml')));
}

export function loadPromptFiles(root: string, includeText = true): PromptFile[] {
  const localesDir = join(root, 'app', 'voicebot', 'locales');
  const promptsDir = join(root, 'app', 'voicebot', 'prompts');
  const out: PromptFile[] = [];

  const sharedPy = listFiles(promptsDir, (n) => n.endsWith('.py') && !n.startsWith('_'));
  for (const abs of sharedPy) {
    const row = toPrompt(root, abs, 'shared', includeText);
    if (row) {
      out.push(row);
    }
  }

  for (const locale of listLocaleIds(localesDir)) {
    const base = join(localesDir, locale);
    const yamlDir = join(base, 'yaml');
    for (const abs of listFiles(yamlDir, (n) => n.endsWith('.yaml') || n.endsWith('.yml'))) {
      const row = toPrompt(root, abs, locale, includeText);
      if (row) {
        out.push(row);
      }
    }
    for (const name of LOCALE_PROMPT_FILES) {
      const abs = join(base, name);
      const row = toPrompt(root, abs, locale, includeText);
      if (row) {
        out.push(row);
      }
    }
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}
