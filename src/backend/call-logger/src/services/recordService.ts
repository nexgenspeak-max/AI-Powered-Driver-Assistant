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
  llm_model?: string;
}

export async function save(record: CallRecord): Promise<void> {
  await docClient.send(new PutCommand({
    TableName: config.dynamodbTable,
    Item: record,
  }));
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
