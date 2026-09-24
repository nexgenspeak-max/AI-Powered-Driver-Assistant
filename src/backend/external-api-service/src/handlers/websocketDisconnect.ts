import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../config';

const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: config.awsRegion }));

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  await docClient.send(new DeleteCommand({
    TableName: config.connectionsTable,
    Key: { connectionId: event.requestContext.connectionId },
  }));

  return { statusCode: 200, body: 'Disconnected' };
};
