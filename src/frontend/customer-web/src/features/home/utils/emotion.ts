import type { AssistantEmotion } from '../stores/assistantAnimStore'

const KEYWORDS: Array<[AssistantEmotion, RegExp]> = [
  ['sad', /xin lỗi|rất tiếc|không thể|đáng tiếc/i],
  ['excited', /tuyệt vời|thành công|xong rồi|hoàn tất/i],
  ['serious', /cảnh báo|lỗi|không hợp lệ|từ chối/i],
  ['happy', /xin chào|cảm ơn|chào bạn|rất vui/i],
]

/** Simple Vietnamese keyword-based heuristic — not a real sentiment/emotion model. */
export function detectEmotion(text: string): AssistantEmotion {
  for (const [emotion, pattern] of KEYWORDS) {
    if (pattern.test(text)) return emotion
  }
  return 'neutral'
}
