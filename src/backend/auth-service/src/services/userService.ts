import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuid } from 'uuid';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

export type Role = 'admin' | 'driver' | 'customer';
export type Status = 'online' | 'offline' | 'locked';

export interface User {
  id: string;
  role: Role;
  name: string;
  phone?: string;
  email?: string;
  password_hash?: string;
  refresh_token_hash?: string;
  refresh_token_expires_at?: string;
  vehicle_type?: string;
  vehicle_plate?: string;
  vehicle_name?: string;
  fcm_token?: string;
  permissions: string[];
  status: Status;
  created_at: string;
  updated_at: string;
  updated_by: string;
}

function now(): string {
  return new Date().toISOString();
}

export async function create(fields: Omit<User, 'id' | 'created_at' | 'updated_at' | 'status' | 'updated_by'>): Promise<User> {
  const id = uuid();
  const user: User = {
    id,
    status: 'offline',
    created_at: now(),
    updated_at: now(),
    updated_by: id,
    ...fields,
  };
  await docClient.send(new PutCommand({ TableName: config.dynamodbTable, Item: user }));
  return user;
}

export async function getById(id: string): Promise<User | null> {
  const result = await docClient.send(new GetCommand({
    TableName: config.dynamodbTable,
    Key: { id },
  }));
  return (result.Item as User) ?? null;
}

// One phone number can belong to multiple accounts (e.g. the same person registered
// as both a driver and a customer) — the phone-index has no sort key, so all matches
// come back and must be narrowed down by role in-app.
export async function getByPhone(phone: string, role?: Role): Promise<User | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'phone-index',
    KeyConditionExpression: 'phone = :phone',
    ExpressionAttributeValues: { ':phone': phone },
  }));
  const items = (result.Items as User[]) ?? [];
  if (role) return items.find(u => u.role === role) ?? null;
  return items[0] ?? null;
}

export async function getByEmail(email: string): Promise<User | null> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email },
  }));
  return (result.Items?.[0] as User) ?? null;
}

export async function listByRole(role: Role): Promise<User[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'role-index',
    KeyConditionExpression: '#role = :role',
    ExpressionAttributeNames: { '#role': 'role' },
    ExpressionAttributeValues: { ':role': role },
  }));
  return (result.Items as User[]) ?? [];
}

export async function update(id: string, fields: Record<string, unknown>, updatedBy = id): Promise<User | null> {
  const data: Record<string, unknown> = { ...fields, updated_at: now(), updated_by: updatedBy };
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  for (const k of Object.keys(data)) {
    names[`#${k}`] = k;
    values[`:${k}`] = data[k];
  }
  const setExpr = 'SET ' + Object.keys(data).map(k => `#${k} = :${k}`).join(', ');

  const result = await docClient.send(new UpdateCommand({
    TableName: config.dynamodbTable,
    Key: { id },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return (result.Attributes as User) ?? null;
}
