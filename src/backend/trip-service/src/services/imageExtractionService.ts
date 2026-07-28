// Delegates to voice-agent's vision-api sidecar (app/vision_api/) instead of
// calling OpenAI directly — that's where this codebase's OpenAI usage
// already lives (STT/LLM/TTS providers), so the delivery-photo scan reuses
// the same OPENAI_API_KEY/model config rather than trip-service holding its
// own copy of it.
import { scanDeliveryPhoto, ExtractedDeliveryInfo } from './voiceAgentClient';

export type { ExtractedDeliveryInfo };

export async function extractDeliveryInfo(imageBase64: string, mimeType?: string): Promise<ExtractedDeliveryInfo> {
  return scanDeliveryPhoto(imageBase64, mimeType);
}
