import jwt from 'jsonwebtoken';
import { config } from '../config';

let cachedToken: string | null = null;
let cachedExpiryEpochSeconds = 0;

// Same shape as authServiceClient.ts's serviceToken() — trip-service signs
// its own short-lived token with the shared JWT_SECRET so voice-agent's
// vision API (app/vision_api/auth.py) can verify it came from a trusted
// service caller, not a driver/customer session.
function serviceToken(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedExpiryEpochSeconds - 30 > now) return cachedToken;

  cachedToken = jwt.sign(
    { sub: 'trip-service', role: 'admin', permissions: ['*'], name: 'trip-service', type: 'access' },
    config.jwtSecret,
    { expiresIn: '5m' },
  );
  cachedExpiryEpochSeconds = now + 5 * 60;
  return cachedToken;
}

export interface ExtractedDeliveryInfo {
  sender_phone: string | null;
  sender_address: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_address: string | null;
  note: string | null;
}

export async function scanDeliveryPhoto(imageBase64: string, mimeType?: string): Promise<ExtractedDeliveryInfo> {
  const res = await fetch(`${config.voiceAgentUrl}/vision/delivery-scan`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${serviceToken()}`,
    },
    body: JSON.stringify({ image_base64: imageBase64, mime_type: mimeType }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`voice-agent /vision/delivery-scan failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as { extracted: ExtractedDeliveryInfo };
  return data.extracted;
}
