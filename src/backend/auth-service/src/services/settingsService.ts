import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: config.awsRegion })
);

export interface AccountSettings {
  id_account: string;
  // Rảnh tay: assistant stays voice-only, minimal manual taps required.
  hands_free_mode: boolean;
  // Gọi/thông báo cho khách khi tài xế gần điểm đón.
  notify_on_pickup_approach: boolean;
  notify_on_pickup_approach_radius_m: number;
  // Trợ lý tự đề xuất điểm dừng chân tiếp theo khi đến gần.
  auto_suggest_next_stop: boolean;
  auto_suggest_next_stop_radius_m: number;
  updated_at: string;
  updated_by: string;
}

export type EditableSettings = Omit<AccountSettings, 'id_account' | 'updated_at' | 'updated_by'>;

// Every feature toggle starts OFF — an account only gets to use a feature once
// someone explicitly turns it on. Radius values are pre-filled with trip-service's
// global PROXIMITY_ALERT_METERS / NEXT_STOP_ANNOUNCE_METERS defaults (1000m / 200m)
// so they're sane the moment the matching toggle is switched on.
export const DEFAULT_SETTINGS: EditableSettings = {
  hands_free_mode: false,
  notify_on_pickup_approach: false,
  notify_on_pickup_approach_radius_m: 1000,
  auto_suggest_next_stop: false,
  auto_suggest_next_stop_radius_m: 200,
};

function now(): string {
  return new Date().toISOString();
}

// Called once at account creation/registration so every account has its settings
// row from day one. Idempotent: a second call for the same account is a no-op
// (won't clobber settings the account may have already changed).
export async function create(accountId: string): Promise<AccountSettings> {
  const item: AccountSettings = {
    id_account: accountId,
    ...DEFAULT_SETTINGS,
    updated_at: now(),
    updated_by: accountId,
  };
  try {
    await docClient.send(new PutCommand({
      TableName: config.dynamodbSettingsTable,
      Item: item,
      ConditionExpression: 'attribute_not_exists(id_account)',
    }));
  } catch (err) {
    if ((err as { name?: string }).name !== 'ConditionalCheckFailedException') throw err;
  }
  return item;
}

export async function getByAccountId(accountId: string): Promise<AccountSettings> {
  const result = await docClient.send(new GetCommand({
    TableName: config.dynamodbSettingsTable,
    Key: { id_account: accountId },
  }));
  if (!result.Item) {
    return { id_account: accountId, ...DEFAULT_SETTINGS, updated_at: now(), updated_by: accountId };
  }
  return result.Item as AccountSettings;
}

export async function update(
  accountId: string,
  fields: Partial<EditableSettings>,
  updatedBy: string
): Promise<AccountSettings> {
  const current = await getByAccountId(accountId);
  const merged: AccountSettings = {
    ...current,
    ...fields,
    id_account: accountId,
    updated_at: now(),
    updated_by: updatedBy,
  };
  await docClient.send(new PutCommand({ TableName: config.dynamodbSettingsTable, Item: merged }));
  return merged;
}
