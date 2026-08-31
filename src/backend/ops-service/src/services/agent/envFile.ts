export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    const eq = line.indexOf('=');
    if (eq < 1) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const comment = value.indexOf(' #');
    if (comment >= 0 && !value.startsWith('"') && !value.startsWith("'")) {
      value = value.slice(0, comment).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const SECRET_KEY = /API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIALS_JSON|CREDENTIALS_FILE/i;

export function isSecretEnvKey(key: string): boolean {
  return SECRET_KEY.test(key);
}

export function presentFlag(env: Record<string, string>, key: string): boolean {
  return Boolean(env[key]?.trim());
}
