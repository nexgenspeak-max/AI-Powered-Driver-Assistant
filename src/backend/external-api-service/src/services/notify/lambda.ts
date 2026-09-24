import { ApiGatewayManagementApiClient, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../config';
import type { NotifyRole } from './types';
import { getLogger } from '../logger';

const log = getLogger('notify');

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

// A driver/customer can have more than one live connection (e.g. app open
// on two devices) — role_id-index returns all of them, we push to each.
export async function notify(role: NotifyRole, id: string, event: string, data: unknown): Promise<void> {
  if (!config.connectionsTable || !config.websocketApiEndpoint) {
    log.warning('CONNECTIONS_TABLE/WEBSOCKET_API_ENDPOINT not set — skipping push');
    return;
  }

  const result = await docClient.send(new QueryCommand({
    TableName: config.connectionsTable,
    IndexName: 'role_id-index',
    KeyConditionExpression: 'role_id = :k',
    ExpressionAttributeValues: { ':k': `${role}#${id}` },
  }));

  const connectionIds = (result.Items ?? []).map((item) => item.connectionId as string);
  if (!connectionIds.length) return;

  const client = new ApiGatewayManagementApiClient({ endpoint: config.websocketApiEndpoint });
  const payload = Buffer.from(JSON.stringify({ event, data }));

  await Promise.all(connectionIds.map(async (connectionId) => {
    try {
      await client.send(new PostToConnectionCommand({ ConnectionId: connectionId, Data: payload }));
    } catch (err) {
      // GoneException — the connection closed but $disconnect never fired
      // (network drop, app killed). Expected/routine, not worth logging loudly.
      if ((err as { name?: string })?.name !== 'GoneException') {
        log.warning('postToConnection failed', {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }));
}
