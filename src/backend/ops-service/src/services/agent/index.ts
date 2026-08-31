import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { config } from '../../config';
import { isSecretEnvKey, parseDotEnv, presentFlag } from './envFile';
import { parseManifest } from './manifest';
import { loadPromptFiles, listLocaleIds, type PromptFile } from './prompts';
import { audienceFromSection, parseToolSchemaSections } from './toolsDefinition';

export type LocaleBundle = {
  id: string;
  routing: string;
  spoken: string;
  stt: string;
  tts_voice: string;
  turn_detection: string;
};

export type ToolEntry = {
  name: string;
  section: string;
  in_schema: boolean;
  audience: 'driver' | 'customer';
  locales: string[];
  description: string;
};

export type EnvPublicRow = {
  key: string;
  value: string;
};

export type AgentSnapshot = {
  source: string;
  env_mtime: string;
  default_locale: string;
  locales: LocaleBundle[];
  models: {
    stt: { provider: string; model: string; language: string; google_model: string; google_location: string };
    llm: { provider: string; model: string };
    tts: { provider: string; voice: string; google_voice: string; elevenlabs_model: string };
  };
  livekit: { url: string; agent_name: string };
  flags: {
    faq_rag: boolean;
    silence_tracker: boolean;
  };
  env_public: EnvPublicRow[];
  secret_keys: string[];
  tools: ToolEntry[];
  tool_count: number;
  prompt_count: number;
};

export type PromptsSnapshot = {
  source: string;
  prompts: PromptFile[];
};

function envPath(root: string): { path: string; label: string } {
  const local = join(root, 'envs', `.env.${config.env === 'local' ? 'local' : config.env}`);
  const example = join(root, 'envs', '.env.example');
  if (existsSync(local)) {
    return { path: local, label: 'envs/.env.local' };
  }
  return { path: example, label: 'envs/.env.example' };
}

function readEnv(file: string): Record<string, string> {
  if (!existsSync(file)) {
    return {};
  }
  return parseDotEnv(readFileSync(file, 'utf8'));
}

function listTools(root: string): ToolEntry[] {
  const localesDir = join(root, 'app', 'voicebot', 'locales');
  const localeIds = listLocaleIds(localesDir);
  const byName = new Map<
    string,
    { locales: string[]; section: string; in_schema: boolean; description: string }
  >();

  const upsert = (
    name: string,
    locale: string,
    section: string,
    inSchema: boolean,
    description: string,
  ) => {
    const prev = byName.get(name) ?? {
      locales: [],
      section: '',
      in_schema: false,
      description: '',
    };
    if (!prev.locales.includes(locale)) {
      prev.locales.push(locale);
    }
    if (inSchema) {
      prev.in_schema = true;
      if (section) {
        prev.section = section;
      }
    } else if (!prev.in_schema && !prev.section && section) {
      prev.section = section;
    }
    if (description && !prev.description) {
      prev.description = description;
    }
    byName.set(name, prev);
  };

  for (const locale of localeIds) {
    const schemaPath = join(localesDir, locale, 'tools_definition.py');
    const schemaTools = existsSync(schemaPath)
      ? parseToolSchemaSections(readFileSync(schemaPath, 'utf8'))
      : [];
    const inSchema = new Set(schemaTools.map((row) => row.name));
    for (const row of schemaTools) {
      upsert(row.name, locale, row.section, true, row.description);
    }
    const toolsDir = join(localesDir, locale, 'tools');
    if (!existsSync(toolsDir)) {
      continue;
    }
    for (const file of readdirSync(toolsDir)) {
      if (!file.endsWith('.py') || file.startsWith('_')) {
        continue;
      }
      const name = file.replace(/\.py$/, '');
      if (!inSchema.has(name)) {
        upsert(name, locale, '', false, '');
      } else {
        upsert(name, locale, '', true, '');
      }
    }
  }

  return [...byName.entries()]
    .map(([name, row]) => ({
      name,
      section: row.section || 'Ungrouped',
      in_schema: row.in_schema,
      audience: audienceFromSection(row.section),
      locales: row.locales.sort(),
      description: row.description,
    }))
    .sort((a, b) => {
      const sec = Number(b.in_schema) - Number(a.in_schema) || a.section.localeCompare(b.section);
      return sec || a.name.localeCompare(b.name);
    });
}

export function loadAgentSnapshot(root = config.voiceAgentRoot): AgentSnapshot {
  const { path: envFile, label } = envPath(root);
  const env = readEnv(envFile);
  let env_mtime = '-';
  try {
    env_mtime = statSync(envFile).mtime.toISOString();
  } catch {
    env_mtime = '-';
  }

  const manifestPath = join(root, 'app', 'voicebot', 'locales', 'manifest.yaml');
  const manifest = existsSync(manifestPath)
    ? parseManifest(readFileSync(manifestPath, 'utf8'))
    : { default: '', locales: {} };

  const locales: LocaleBundle[] = Object.entries(manifest.locales).map(([id, row]) => ({
    id,
    routing: row.routing || id,
    spoken: row.spoken || '-',
    stt: row.stt || '-',
    tts_voice: row.tts_voice || '-',
    turn_detection: row.turn_detection || '-',
  }));

  const tools = listTools(root);
  const pick = (key: string, fallback = '-'): string => env[key]?.trim() || fallback;

  const env_public: EnvPublicRow[] = Object.keys(env)
    .filter((key) => !isSecretEnvKey(key))
    .sort()
    .map((key) => ({ key, value: env[key] }));

  const secret_keys = Object.keys(env)
    .filter((key) => isSecretEnvKey(key) && presentFlag(env, key))
    .sort();

  return {
    source: label,
    env_mtime,
    default_locale: pick('VOICE_AGENT_LANG', manifest.default || '-'),
    locales,
    models: {
      stt: {
        provider: pick('STT_PROVIDER'),
        model: pick('STT_MODEL'),
        language: pick('STT_LANGUAGE'),
        google_model: pick('GOOGLE_STT_MODEL'),
        google_location: pick('GOOGLE_STT_LOCATION'),
      },
      llm: {
        provider: pick('LLM_PROVIDER'),
        model: pick('LLM_MODEL'),
      },
      tts: {
        provider: pick('TTS_PROVIDER'),
        voice: pick('TTS_VOICE') || pick('GOOGLE_TTS_VOICE') || pick('ELEVENLABS_VOICE_ID'),
        google_voice: pick('GOOGLE_TTS_VOICE'),
        elevenlabs_model: pick('ELEVENLABS_MODEL'),
      },
    },
    livekit: {
      url: pick('LIVEKIT_URL'),
      agent_name: pick('LIVEKIT_AGENT_NAME', 'driver-assistant'),
    },
    flags: {
      faq_rag: pick('FAQ_RAG_ENABLED', 'true') !== 'false',
      silence_tracker: pick('SILENCE_TRACKER_ENABLED', 'true') !== 'false',
    },
    env_public,
    secret_keys,
    tools,
    tool_count: tools.length,
    prompt_count: loadPromptFiles(root, false).length,
  };
}

export function loadPromptsSnapshot(root = config.voiceAgentRoot): PromptsSnapshot {
  const { label } = envPath(root);
  return {
    source: label,
    prompts: loadPromptFiles(root, true),
  };
}
