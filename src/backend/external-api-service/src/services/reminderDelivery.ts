import { reachDriver } from './driverReachService';
import { getLogger } from './logger';
import * as reminderService from './reminderService';

const log = getLogger('reminderDelivery');

/** Speak due pickup reminders in the open assistant session, or save them for the next app open. */
export async function deliverDueReminders(driverPhone?: string): Promise<number> {
  const due = await reminderService.takeDue(Date.now(), driverPhone);
  for (const item of due) {
    try {
      await reachDriver(item.driver_phone, 'pickup_reminder', {
        related_trip_id: item.trip_id,
        customer_name: item.customer_name,
        pickup_address: item.pickup_address,
      });
    } catch (err) {
      log.warning('pickup reminder delivery failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return due.length;
}
