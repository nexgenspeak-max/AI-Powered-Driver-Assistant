import type { SQSHandler } from 'aws-lambda';
import * as dispatchOrchestrator from '../services/dispatchOrchestrator';

// Consumes the SQS queue dispatchTimer/lambda.ts enqueues into (15s
// DelaySeconds per message) — this is what actually makes "wait 15s, then
// move to the next candidate" work correctly under Lambda, where an
// in-process setTimeout has no guarantee of surviving between invocations.
export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const { tripId, candidatePhone } = JSON.parse(record.body) as { tripId: string; candidatePhone: string };
    // Let failures throw — SQS redelivers per the queue's redrive policy
    // instead of silently dropping a timeout that should have fired.
    await dispatchOrchestrator.handleOfferTimeout(tripId, candidatePhone);
  }
};
