import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

function now(): string {
  return new Date().toISOString();
}

export interface Trip {
  trip_id: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat?: number;
  pickup_lng?: number;
  dropoff_lat?: number;
  dropoff_lng?: number;
  pickup_time: string;
  booked_via: string;
  distance_km: number;
  eta_minutes: number;
  traffic_note: string;
  route_summary: string;
  room_name: string;
  driver_phone?: string;
  id_account?: string;
  wait_extra_minutes?: number;
  last_issue?: Record<string, unknown>;
  no_show_reported_at?: string;
  created_at: string;
  updated_at: string;
}

export async function create(data: Record<string, unknown>): Promise<Trip> {
  const trip: Trip = {
    trip_id: randomUUID(),
    status: 'pending',
    customer_name: data.customer_name as string,
    customer_phone: (data.customer_phone as string) || '',
    pickup_address: data.pickup_address as string,
    dropoff_address: data.dropoff_address as string,
    pickup_time: (data.pickup_time as string) || '',
    booked_via: (data.booked_via as string) || 'app',
    distance_km: (data.distance_km as number) || 0,
    eta_minutes: (data.eta_minutes as number) || 0,
    traffic_note: (data.traffic_note as string) || '',
    route_summary: (data.route_summary as string) || '',
    room_name: '',
    created_at: now(),
    updated_at: now(),
  };
  if (data.driver_phone) trip.driver_phone = data.driver_phone as string;
  if (data.id_account) trip.id_account = data.id_account as string;
  if (typeof data.pickup_lat === 'number') trip.pickup_lat = data.pickup_lat;
  if (typeof data.pickup_lng === 'number') trip.pickup_lng = data.pickup_lng;
  if (typeof data.dropoff_lat === 'number') trip.dropoff_lat = data.dropoff_lat;
  if (typeof data.dropoff_lng === 'number') trip.dropoff_lng = data.dropoff_lng;

  await docClient.send(new PutCommand({ TableName: config.dynamodbTable, Item: trip }));
  return trip;
}

export async function get(tripId: string): Promise<Trip | null> {
  const result = await docClient.send(new GetCommand({
    TableName: config.dynamodbTable,
    Key: { trip_id: tripId },
  }));
  return (result.Item as Trip) ?? null;
}

export async function updateStatus(
  tripId: string,
  status: string,
  extra: Record<string, unknown> = {}
): Promise<Trip | null> {
  const fields = { status, updated_at: now(), ...extra };
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};

  for (const k of Object.keys(fields)) {
    names[`#${k}`] = k;
    values[`:${k}`] = (fields as Record<string, unknown>)[k];
  }

  const setExpr = 'SET ' + Object.keys(fields).map(k => `#${k} = :${k}`).join(', ');

  const result = await docClient.send(new UpdateCommand({
    TableName: config.dynamodbTable,
    Key: { trip_id: tripId },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
    ReturnValues: 'ALL_NEW',
  }));
  return (result.Attributes as Trip) ?? null;
}

export async function listRecent(limit = 50): Promise<Trip[]> {
  const result = await docClient.send(new ScanCommand({ TableName: config.dynamodbTable, Limit: limit }));
  const items = (result.Items as Trip[]) ?? [];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listByStatus(status: string, limit = 50): Promise<Trip[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'status-created_at-index',
    KeyConditionExpression: '#s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': status },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as Trip[]) ?? [];
}

export async function listByDriver(driverPhone: string, limit = 50): Promise<Trip[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'driver_phone-created_at-index',
    KeyConditionExpression: 'driver_phone = :p',
    ExpressionAttributeValues: { ':p': driverPhone },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as Trip[]) ?? [];
}

// Bounded date-range query on the same GSI as listByDriver, instead of
// fetching a fixed N most-recent trips and filtering client-side by a
// timestamp — that approach (still used by listByDriverAndStatus below)
// silently drops in-range trips once a driver has more than N trips total.
// Paginated via LastEvaluatedKey since a driver's full 7/30-day trip count
// can exceed a single Query page (DynamoDB's ~1MB-per-page limit), so
// there's no arbitrary cap to outgrow here.
export async function listByDriverInRange(driverPhone: string, fromIso: string, toIso: string): Promise<Trip[]> {
  const items: Trip[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;
  do {
    const result = await docClient.send(new QueryCommand({
      TableName: config.dynamodbTable,
      IndexName: 'driver_phone-created_at-index',
      KeyConditionExpression: 'driver_phone = :p AND created_at BETWEEN :from AND :to',
      ExpressionAttributeValues: { ':p': driverPhone, ':from': fromIso, ':to': toIso },
      ScanIndexForward: false,
      ExclusiveStartKey: exclusiveStartKey,
    }));
    items.push(...((result.Items as Trip[]) ?? []));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);
  return items;
}

export async function listByDriverAndStatus(driverPhone: string, status: string, limit = 50): Promise<Trip[]> {
  const trips = await listByDriver(driverPhone, 200);
  return trips.filter(t => t.status === status).slice(0, limit);
}

// No index on customer_phone — callers with an id_account should use listByAccount
// instead. This stays Scan-based for the voice-agent, which only knows the caller's
// phone number (no account id) when it looks up customer context mid-call.
export async function listByCustomerPhone(customerPhone: string, limit = 50): Promise<Trip[]> {
  const result = await docClient.send(new ScanCommand({
    TableName: config.dynamodbTable,
    FilterExpression: 'customer_phone = :p',
    ExpressionAttributeValues: { ':p': customerPhone },
    Limit: limit * 3,
  }));
  const items = (result.Items as Trip[]) ?? [];
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
}

export async function listByAccount(idAccount: string, limit = 50): Promise<Trip[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbTable,
    IndexName: 'id_account-created_at-index',
    KeyConditionExpression: 'id_account = :a',
    ExpressionAttributeValues: { ':a': idAccount },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as Trip[]) ?? [];
}
