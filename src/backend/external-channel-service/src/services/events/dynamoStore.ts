import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { EventStore, ProviderEvent, eventDateOf } from './store';

const RETENTION_DAYS = 90;
const DATE_INDEX = 'event_date-sk-index';

/**
 * Table schema (infra/external-channel-service/sam.yaml):
 *   PK sid, SK sk = `${ts}#${uuid}`, GSI event_date + sk, TTL attribute `ttl`.
 */
export class DynamoEventStore implements EventStore {
  private readonly doc: DynamoDBDocumentClient;

  constructor(private readonly table: string, region: string) {
    this.doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }));
  }

  async put(event: ProviderEvent): Promise<void> {
    await this.doc.send(new PutCommand({
      TableName: this.table,
      Item: {
        ...event,
        sk: `${event.ts}#${randomUUID()}`,
        event_date: eventDateOf(event.ts),
        ttl: Math.floor(Date.parse(event.ts) / 1000) + RETENTION_DAYS * 86400,
      },
    }));
  }

  async list(limit: number, sid?: string): Promise<ProviderEvent[]> {
    if (sid) {
      const r = await this.doc.send(new QueryCommand({
        TableName: this.table,
        KeyConditionExpression: 'sid = :s',
        ExpressionAttributeValues: { ':s': sid },
        ScanIndexForward: false,
        Limit: limit,
      }));
      return strip(r.Items);
    }
    // Recent events across all calls: walk back day by day on the date index.
    const out: ProviderEvent[] = [];
    let day = Date.now();
    for (let i = 0; i < 7 && out.length < limit; i += 1, day -= 86400 * 1000) {
      const r = await this.doc.send(new QueryCommand({
        TableName: this.table,
        IndexName: DATE_INDEX,
        KeyConditionExpression: 'event_date = :d',
        ExpressionAttributeValues: { ':d': eventDateOf(new Date(day).toISOString()) },
        ScanIndexForward: false,
        Limit: limit - out.length,
      }));
      out.push(...strip(r.Items));
    }
    return out;
  }
}

function strip(items: Record<string, unknown>[] | undefined): ProviderEvent[] {
  return (items ?? []).map(({ sk: _sk, event_date: _d, ttl: _t, ...rest }) => rest as ProviderEvent);
}
