// One-off backfill: ensures every existing row in `accounts` (created before
// the driver-settings table existed) has a matching settings row, so GET
// /api/v1/settings/:accountId always has a real row to read instead of
// falling back to the in-memory default. New accounts already get a row at
// registration time (see routes/auth.ts) — this script only covers the
// backlog of accounts that predate that.
//
// Usage: npx ts-node-dev --transpile-only --respawn=false scripts/backfillSettings.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../src/config';
import { DEFAULT_SETTINGS } from '../src/services/settingsService';
import { getLogger } from '../src/services/logger';

const log = getLogger('backfillSettings');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

function now(): string {
  return new Date().toISOString();
}

async function ensureSettingsRow(accountId: string): Promise<'created' | 'exists'> {
  const item = { id_account: accountId, ...DEFAULT_SETTINGS, updated_at: now(), updated_by: accountId };
  try {
    await docClient.send(new PutCommand({
      TableName: config.dynamodbSettingsTable,
      Item: item,
      // Never overwrite a row an account may have already customized.
      ConditionExpression: 'attribute_not_exists(id_account)',
    }));
    return 'created';
  } catch (err) {
    if ((err as { name?: string }).name === 'ConditionalCheckFailedException') return 'exists';
    throw err;
  }
}

async function main() {
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let scanned = 0;
  let created = 0;
  let existing = 0;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: config.dynamodbTable,
      ExclusiveStartKey: lastEvaluatedKey,
      ProjectionExpression: 'id',
    }));
    const items = (result.Items ?? []) as { id: string }[];
    for (const { id } of items) {
      scanned++;
      const outcome = await ensureSettingsRow(id);
      if (outcome === 'created') created++;
      else existing++;
    }
    lastEvaluatedKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  log.info('scan complete', { scanned, table: config.dynamodbTable });
  log.info('settings rows', { created, existing, table: config.dynamodbSettingsTable });
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    log.error('failed', { error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  });
