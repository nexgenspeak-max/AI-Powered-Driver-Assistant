import { config } from '../../config';
import * as local from './local';
import * as lambda from './lambda';

const impl = config.env === 'local' ? local : lambda;

export async function scheduleOfferTimeout(tripId: string, candidatePhone: string, seconds: number): Promise<void> {
  await impl.scheduleOfferTimeout(tripId, candidatePhone, seconds);
}
