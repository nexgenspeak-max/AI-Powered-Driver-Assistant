import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
  type FilteredLogEvent,
} from '@aws-sdk/client-cloudwatch-logs';
import { config, LOG_SERVICE_IDS, type LogServiceId } from '../../config';
import { filterTerms, lineMatches, type LogFilter } from './filter';

/** Snapshot window when the caller gives no start time. */
const SNAPSHOT_WINDOW_MS = 30 * 60 * 1000;
const MAX_PAGES = 10;

/** Lambda runtime prefix: `<iso ts>\t<request id>\t<LEVEL>\t`. */
const LAMBDA_PREFIX = /^\d{4}-\d{2}-\d{2}T[\d:.]+Z\t[^\t]*\t[A-Z]+\t/;
const PLATFORM_LINE = /^(START|END|REPORT|INIT_START) /;

let client: CloudWatchLogsClient | null = null;

/** Names follow infra/<service>/sam.yaml and infra/llm-orchestrator/cfn.yaml. */
export function logGroupName(service: LogServiceId): string {
  const prefix = `${config.env}-${config.appName}`;
  return service === 'llm-orchestrator'
    ? `/ecs/${prefix}-llm-orchestrator`
    : `/aws/lambda/${prefix}-${service}-fn`;
}

/** Strips the Lambda runtime prefix; returns '' for platform lines. */
export function cleanMessage(message: string): string {
  const text = message.replace(/\r?\n$/, '');
  if (PLATFORM_LINE.test(text)) {
    return '';
  }
  return text.replace(LAMBDA_PREFIX, '');
}

/** Every term must appear: `"room=driver-088" "timeout"`. CloudWatch matches terms case-sensitively. */
export function filterPattern(filter: LogFilter): string | undefined {
  const terms = filterTerms(filter).map((term) => `"${term.replace(/"/g, '')}"`);
  return terms.length ? terms.join(' ') : undefined;
}

async function groupEvents(group: string, pattern: string | undefined, startTime: number): Promise<FilteredLogEvent[]> {
  client ??= new CloudWatchLogsClient({ region: config.awsRegion });
  const events: FilteredLogEvent[] = [];
  let nextToken: string | undefined;
  try {
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const r = await client.send(
        new FilterLogEventsCommand({ logGroupName: group, filterPattern: pattern, startTime, nextToken }),
      );
      events.push(...(r.events ?? []));
      nextToken = r.nextToken;
      if (!nextToken) break;
    }
  } catch (err) {
    // A service that is not deployed has no log group: no lines, not an error.
    if ((err as { name?: string }).name === 'ResourceNotFoundException') {
      return [];
    }
    throw err;
  }
  return events;
}

/**
 * Newest `limit` matching lines since `startTime` (ms), oldest first.
 * `lastTs` is the newest event time, or `startTime - 1` when nothing matched,
 * so a poller passing `lastTs + 1` back never skips or repeats a line.
 */
export async function cloudwatchLines(
  service: LogServiceId | undefined,
  filter: LogFilter,
  limit: number,
  startTime: number = Date.now() - SNAPSHOT_WINDOW_MS,
): Promise<{ lines: string[]; lastTs: number }> {
  const services = service ? [service] : [...LOG_SERVICE_IDS];
  const pattern = filterPattern(filter);
  const perGroup = await Promise.all(services.map((id) => groupEvents(logGroupName(id), pattern, startTime)));
  const events = perGroup
    .flat()
    .map((e) => ({ ts: e.timestamp ?? 0, line: cleanMessage(e.message ?? '') }))
    .filter((e) => e.line && lineMatches(e.line, filter))
    .sort((a, b) => a.ts - b.ts)
    .slice(-limit);
  const lastTs = events.length ? events[events.length - 1].ts : startTime - 1;
  return { lines: events.map((e) => e.line), lastTs };
}
