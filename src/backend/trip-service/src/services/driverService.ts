import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const driversTable = config.dynamodbTable.replace('-trips', '-drivers');
const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

function now(): string {
  return new Date().toISOString();
}

export interface Driver {
  phone: string;
  name: string;
  fcm_token: string;
  status: string;
  registered_at: string;
  updated_at: string;
}

export async function register(phone: string, name: string, fcmToken = ''): Promise<Driver> {
  const driver: Driver = {
    phone, name, fcm_token: fcmToken,
    status: 'offline',
    registered_at: now(),
    updated_at: now(),
  };
  await docClient.send(new PutCommand({ TableName: driversTable, Item: driver }));
  return driver;
}

export async function get(phone: string): Promise<Driver | null> {
  const result = await docClient.send(new GetCommand({
    TableName: driversTable,
    Key: { phone },
  }));
  return (result.Item as Driver) ?? null;
}

export async function update(phone: string, fields: Record<string, unknown>): Promise<Driver | null> {
  const data: Record<string, unknown> = { ...fields, updated_at: now() };
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const k of Object.keys(data)) {
    names[`#${k}`] = k;
    values[`:${k}`] = data[k];
  }
  const setExpr = 'SET ' + Object.keys(data).map(k => `#${k} = :${k}`).join(', ');

  const result = await docClient.send(new UpdateCommand({
    TableName: driversTable,
    Key: { phone },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return (result.Attributes as Driver) ?? null;
}

export async function listAll(): Promise<Driver[]> {
  const result = await docClient.send(new ScanCommand({ TableName: driversTable }));
  const items = (result.Items as Driver[]) ?? [];
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export function listOnline(drivers: Driver[]): Driver[] {
  return drivers.filter(d => d.status === 'online');
}
