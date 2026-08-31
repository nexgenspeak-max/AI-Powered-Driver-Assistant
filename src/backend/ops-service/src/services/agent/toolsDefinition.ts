/** Parse LiveKit tool schemas in locales/<lang>/tools_definition.py. Section comments are the grouping developers maintain. */

export type SchemaTool = {
  name: string;
  section: string;
  description: string;
};

const HEADER = /^\s*# ─+\s*(.+?)\s*─+\s*$/;
const NAME_LINE = /^\s+"name":\s+"([a-z][a-z0-9_]*)"\s*,?\s*$/;

function readFollowingDescription(lines: string[], start: number): string {
  const slice = lines.slice(start, start + 48).join('\n');
  const paren = /"description":\s*\(\s*([\s\S]*?)\)\s*,/.exec(slice);
  const quoted = /"description":\s*"((?:\\.|[^"\\])*)"/.exec(slice);
  const body = paren?.[1] ?? quoted?.[1];
  if (!body) {
    return '';
  }
  const parts = [...body.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((m) =>
    m[1].replace(/\\n/g, ' '),
  );
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function parseToolSchemaSections(text: string): SchemaTool[] {
  let section = '';
  const out: SchemaTool[] = [];
  const seen = new Set<string>();
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const header = HEADER.exec(lines[i]);
    if (header) {
      section = header[1].trim();
      continue;
    }
    const named = NAME_LINE.exec(lines[i]);
    if (!named) {
      continue;
    }
    const name = named[1];
    if (seen.has(name)) {
      continue;
    }
    seen.add(name);
    out.push({
      name,
      section: section || 'Ungrouped',
      description: readFollowingDescription(lines, i + 1),
    });
  }
  return out;
}

export function audienceFromSection(section: string): 'driver' | 'customer' {
  return /customer/i.test(section) ? 'customer' : 'driver';
}
