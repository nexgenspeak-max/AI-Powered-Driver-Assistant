import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

function now(): string {
  return new Date().toISOString();
}

// Last-mile delivery lifecycle, driver-driven (no counterparty like trips'
// customer-vs-driver split): pending -> picked_up -> delivering -> delivered,
// with delivering able to fork to redelivery (failed attempt, retry later)
// or returned (given back to sender). See ALLOWED_TRANSITIONS in
// routes/deliveryOrders.ts for the exact graph.
export type DeliveryOrderStatus =
  | 'pending'
  | 'picked_up'
  | 'delivering'
  | 'delivered'
  | 'redelivery'
  | 'returned';

export interface DeliveryOrder {
  order_id: string;
  driver_phone: string;
  status: DeliveryOrderStatus;
  sender_phone: string;
  sender_address?: string;
  recipient_name?: string;
  recipient_phone: string;
  recipient_address: string;
  note?: string;
  // 'ai_scan' orders were created from a driver photo the vision model read;
  // 'manual' ones were typed in directly — kept so a bad scan is easy to
  // tell apart from a driver typo when someone's debugging a wrong order.
  source: 'ai_scan' | 'manual';
  created_at: string;
  updated_at: string;
}

export async function create(data: Record<string, unknown>): Promise<DeliveryOrder> {
  const order: DeliveryOrder = {
    order_id: randomUUID(),
    driver_phone: data.driver_phone as string,
    status: 'pending',
    sender_phone: (data.sender_phone as string) || '',
    recipient_phone: data.recipient_phone as string,
    recipient_address: data.recipient_address as string,
    source: data.source === 'manual' ? 'manual' : 'ai_scan',
    created_at: now(),
    updated_at: now(),
  };
  if (data.sender_address) order.sender_address = data.sender_address as string;
  if (data.recipient_name) order.recipient_name = data.recipient_name as string;
  if (data.note) order.note = data.note as string;

  await docClient.send(new PutCommand({ TableName: config.dynamodbDeliveryOrdersTable, Item: order }));
  return order;
}

export async function get(orderId: string): Promise<DeliveryOrder | null> {
  const result = await docClient.send(new GetCommand({
    TableName: config.dynamodbDeliveryOrdersTable,
    Key: { order_id: orderId },
  }));
  return (result.Item as DeliveryOrder) ?? null;
}

export async function updateStatus(orderId: string, status: DeliveryOrderStatus): Promise<DeliveryOrder | null> {
  const result = await docClient.send(new UpdateCommand({
    TableName: config.dynamodbDeliveryOrdersTable,
    Key: { order_id: orderId },
    UpdateExpression: 'SET #status = :status, updated_at = :updated_at',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': status, ':updated_at': now() },
    ReturnValues: 'ALL_NEW',
  }));
  return (result.Attributes as DeliveryOrder) ?? null;
}

export async function listByDriver(driverPhone: string, limit = 50): Promise<DeliveryOrder[]> {
  const result = await docClient.send(new QueryCommand({
    TableName: config.dynamodbDeliveryOrdersTable,
    IndexName: 'driver_phone-created_at-index',
    KeyConditionExpression: 'driver_phone = :p',
    ExpressionAttributeValues: { ':p': driverPhone },
    ScanIndexForward: false,
    Limit: limit,
  }));
  return (result.Items as DeliveryOrder[]) ?? [];
}

export async function remove(orderId: string): Promise<void> {
  await docClient.send(new DeleteCommand({
    TableName: config.dynamodbDeliveryOrdersTable,
    Key: { order_id: orderId },
  }));
}
