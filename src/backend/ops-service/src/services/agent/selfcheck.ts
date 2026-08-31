/**
 * Disk-read parsers for Super Admin agent snapshot. Run: npm run verify:ops
 * Asserts live voice-agent files — not a hardcoded tool catalog.
 */
import { parseDotEnv } from './envFile';
import { parseManifest } from './manifest';
import { loadAgentSnapshot, loadPromptsSnapshot } from './index';
import { parseToolSchemaSections } from './toolsDefinition';
import { config } from '../../config';

function assert(cond: unknown, msg: string): void {
  if (!cond) {
    throw new Error(msg);
  }
}

const envSample = parseDotEnv(`
# comment
LLM_MODEL=gpt-test
OPENAI_API_KEY=sk-secret
STT_PROVIDER=google
`);
assert(envSample.LLM_MODEL === 'gpt-test', 'parseDotEnv LLM_MODEL');
assert(envSample.STT_PROVIDER === 'google', 'parseDotEnv STT_PROVIDER');
assert(!('comment' in envSample), 'parseDotEnv skips comments');

const manifest = parseManifest(`
default: vn
locales:
  vn:
    routing: vn
    spoken: vi
    stt: vi-VN
    tts_voice: vi-VN-Standard-A
    turn_detection: multilingual
  en:
    routing: en
    spoken: en
    stt: en-US
    tts_voice: en-US-Standard-C
    turn_detection: multilingual
`);
assert(manifest.default === 'vn', 'manifest default');
assert(manifest.locales.vn.stt === 'vi-VN', 'manifest vn.stt');
assert(manifest.locales.en.routing === 'en', 'manifest en.routing');

const fixtureA = `
raw_schema = {
    # ── Driver inbound ────────────────────────────────────────────────────────
    "alpha_tool": {
        "type": "function",
        "name": "alpha_tool",
        "description": (
            "First line of the tool prompt. "
            "Second line stays with it."
        ),
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
    # ── Customer agent ────────────────────────────────────────────────────────
    "beta_tool": {
        "type": "function",
        "name": "beta_tool",
        "description": "Customer-facing copy.",
        "parameters": {"type": "object", "properties": {}, "required": []},
    },
}
`;

const parsedA = parseToolSchemaSections(fixtureA);
assert(parsedA.length === 2, `fixture A count ${parsedA.length}`);
assert(parsedA[0].name === 'alpha_tool' && parsedA[0].section === 'Driver inbound', 'section from comment');
assert(parsedA[0].description.includes('First line of the tool prompt'), 'description from schema');
assert(parsedA[1].section === 'Customer agent', 'customer section');

const fixtureB = fixtureA.replace('Driver inbound', 'Trips & schedule');
const parsedB = parseToolSchemaSections(fixtureB);
assert(parsedB[0].section === 'Trips & schedule', 'section header change must appear in parse');
assert(parsedB[0].section !== parsedA[0].section, 'changing tools_definition comment changes Super Admin groups');

const snapshot = loadAgentSnapshot(config.voiceAgentRoot);
assert(snapshot.tool_count > 0, `live tool_count=${snapshot.tool_count}`);
assert(
  snapshot.tools.some((t) => t.name === 'check_upcoming_trips' && t.in_schema),
  'check_upcoming_trips from tools_definition.py',
);
assert(
  snapshot.tools.some((t) => t.section === 'Driver inbound'),
  'live section headers from tools_definition.py',
);
assert(snapshot.prompt_count > 0, `prompt_count=${snapshot.prompt_count}`);
assert(snapshot.source.includes('.env'), 'env file label');
const secretLeak = snapshot.env_public.some((row) => /KEY|SECRET|TOKEN|PASSWORD/i.test(row.key));
assert(!secretLeak, 'env_public must not include secret keys');

const prompts = loadPromptsSnapshot(config.voiceAgentRoot);
assert(
  prompts.prompts.some((p) => p.path.endsWith('yaml/greeting.yaml') && p.text.length > 0),
  'greeting.yaml text must be in prompts snapshot',
);
assert(
  prompts.prompts.some((p) => p.path.includes('tools_definition.py') && p.text.includes('check_upcoming_trips')),
  'tools_definition.py must be listed so schema edits are visible',
);

process.stdout.write(
  `verify:ops ok tools=${snapshot.tool_count} prompts=${prompts.prompts.length} source=${snapshot.source}\n`,
);
