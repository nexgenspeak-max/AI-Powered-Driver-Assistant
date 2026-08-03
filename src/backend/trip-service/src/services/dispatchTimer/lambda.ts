import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../../config';

const sqs = new SQSClient({ region: config.awsRegion });

// SQS's per-message DelaySeconds (max 900s) is what actually makes "wait
// 15s, then check-and-advance" work correctly under Lambda — see
// src/handlers/dispatchTimeoutConsumer.ts for the consumer side.
export async function scheduleOfferTimeout(tripId: string, candidatePhone: string, seconds: number): Promise<void> {
  if (!config.dispatchTimeoutQueueUrl) {
    console.warn(`[dispatchTimer] DISPATCH_TIMEOUT_QUEUE_URL not set — offer for trip=${tripId} will never auto-expire in this env`);
    return;
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: config.dispatchTimeoutQueueUrl,
    MessageBody: JSON.stringify({ tripId, candidatePhone }),
    DelaySeconds: Math.min(Math.max(Math.round(seconds), 0), 900),
  }));
}
