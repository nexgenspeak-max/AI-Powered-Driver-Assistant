import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

export interface Turn {
  role: string;
  text: string;
  ts: number;
}

export interface CallRecord {
  call_id: string;
  caller: string;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  turns: Turn[];
  summary: string;
  stt_provider?: string;
  llm_provider?: string;
  llm_model?: string;
  // Report day in Vietnam time (YYYY-MM-DD); partition key of the
  // record_date-started_at-index GSI used by ops-service daily reports.
  record_date?: string;
  // Structured per-session quality metrics sent by llm-orchestrator
  // (session type, latency, tool outcomes, fallbacks…). Opaque here.
  metrics?: Record<string, unknown>;
  // Unix epoch seconds — DynamoDB's native TTL (enabled on this exact
  // attribute name in infra/call-records-service/sam.yaml) auto-deletes the item once
  // this passes. Optional: a record without it is kept forever.
  ttl?: number;
}

const VN_OFFSET_MS = 7 * 3600 * 1000; // Asia/Ho_Chi_Minh, no DST
export const DATE_INDEX = 'record_date-started_at-index';

/** Vietnam calendar day of an ISO timestamp, e.g. 2026-09-27T20:30:00Z → 2026-09-28. */
export function recordDateOf(iso: string): string {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`invalid started_at: ${iso}`);
  return new Date(ms + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** UTC ISO bounds [from, to) of a Vietnam calendar day. */
export function dayBoundsUtc(date: string): { from: string; to: string } {
  const start = Date.parse(`${date}T00:00:00.000Z`) - VN_OFFSET_MS;
  return {
    from: new Date(start).toISOString(),
    to: new Date(start + 24 * 3600 * 1000).toISOString(),
  };
}

export async function save(record: CallRecord): Promise<void> {
  const item: CallRecord = {
    ...record,
    record_date: record.record_date || recordDateOf(record.started_at),
  };
  await docClient.send(new PutCommand({
    TableName: config.dynamodbTable,
    Item: item,
  }));
}

export interface Page {
  items: CallRecord[];
  next_cursor: string | null;
}

function encodeCursor(key: Record<string, unknown> | undefined): string | null {
  return key ? Buffer.from(JSON.stringify(key)).toString('base64url') : null;
}

function decodeCursor(cursor?: string): Record<string, unknown> | undefined {
  return cursor ? JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) : undefined;
}

function isMissingIndex(err: unknown): boolean {
  const e = err as { name?: string; message?: string };
  return e?.name === 'ValidationException' && /index/i.test(e.message ?? '');
}

/** Records of one Vietnam calendar day, oldest first, paginated. */
export async function listByDate(date: string, limit = 100, cursor?: string): Promise<Page> {
  try {
    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamodbTable,
      IndexName: DATE_INDEX,
      KeyConditionExpression: 'record_date = :d',
      ExpressionAttributeValues: { ':d': date },
      ScanIndexForward: true,
      Limit: limit,
      ExclusiveStartKey: decodeCursor(cursor),
    }));
    return { items: (result.Items as CallRecord[]) ?? [], next_cursor: encodeCursor(result.LastEvaluatedKey) };
  } catch (err) {
    if (!isMissingIndex(err)) throw err;
    // Table created before the date index existed (local dev): fall back to a
    // filtered scan on started_at so reports still work until the index is added.
    const { from, to } = dayBoundsUtc(date);
    const result = await docClient.send(new ScanCommand({
      TableName: config.dynamodbTable,
      FilterExpression: 'started_at >= :from AND started_at < :to',
      ExpressionAttributeValues: { ':from': from, ':to': to },
      ExclusiveStartKey: decodeCursor(cursor),
    }));
    return { items: (result.Items as CallRecord[]) ?? [], next_cursor: encodeCursor(result.LastEvaluatedKey) };
  }
}

export async function get(callId: string): Promise<CallRecord | null> {
  const result = await docClient.send(new GetCommand({
    TableName: config.dynamodbTable,
    Key: { call_id: callId },
  }));
  return (result.Item as CallRecord) ?? null;
}

export async function listByCaller(caller: string, limit = 20): Promise<CallRecord[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'caller-started_at-index',
    KeyConditionExpression: 'caller = :caller',
    ExpressionAttributeValues: { ':caller': caller },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as CallRecord[]) ?? [];
}

export async function listRecent(limit = 20): Promise<CallRecord[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: config.dynamodbTable,
    Limit: limit,
  }));
  const items = (result.Items as CallRecord[]) ?? [];
  return items.sort((a, b) => b.started_at.localeCompare(a.started_at));
}
