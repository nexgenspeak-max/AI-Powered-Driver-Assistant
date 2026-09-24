import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

// $connect route (sam.yaml) — client connects to
// wss://.../ws?role=driver&id=<phone>, matching notify/local.ts's ws server
// so FE client code is identical across environments.
export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  const role = event.queryStringParameters?.role;
  const id = event.queryStringParameters?.id;

  if (!role || !id) {
    return { statusCode: 400, body: 'role and id query params are required' };
  }

  await docClient.send(new PutCommand({
    TableName: config.connectionsTable,
    Item: {
      connectionId,
      role,
      id,
      role_id: `${role}#${id}`,
      connected_at: new Date().toISOString(),
    },
  }));

  return { statusCode: 200, body: 'Connected' };
};
