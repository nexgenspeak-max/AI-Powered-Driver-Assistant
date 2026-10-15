interface TripLike {
  pickup_address?: string;
  pickup_time?: string;
}

/** "HH:MM" in Vietnam time from an ISO timestamp; '' when absent or unparsable. */
function vnTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' });
}

/**
 * Default trip-confirmation SMS (FR-K03): content comes only from trip data.
 * The sender label is added by smsService for every customer SMS.
 */
export function buildTripConfirmationSms(trip: TripLike): string {
  const parts = ['Chuyến xe của bạn đã được tài xế xác nhận.'];
  if (trip.pickup_address) parts.push(`Điểm đón: ${trip.pickup_address}.`);
  const t = vnTime(trip.pickup_time);
  if (t) parts.push(`Giờ đón: ${t}.`);
  parts.push('Tài xế sẽ liên hệ khi đến nơi.');
  return parts.join(' ');
}
