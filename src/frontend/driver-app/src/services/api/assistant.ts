const CANNED_REPLIES = [
  'Mình đã ghi nhận yêu cầu của bạn, để mình kiểm tra thêm nhé.',
  'Bạn có thể xem chuyến đi hiện tại ở tab Dashboard.',
  'Cảm ơn bạn đã chia sẻ, mình sẽ hỗ trợ bạn ngay.',
]

/**
 * TODO: wire a real LLM here (Gemini/OpenAI/Anthropic or a new trip-service
 * chat endpoint). For now this returns a canned reply so the assistant UI
 * has something to show without requiring an API key.
 */
export async function getAssistantReply(message: string): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 600))
  const reply = CANNED_REPLIES[Math.floor(Math.random() * CANNED_REPLIES.length)]
  return message.trim() ? reply : 'Bạn muốn hỏi mình điều gì?'
}
