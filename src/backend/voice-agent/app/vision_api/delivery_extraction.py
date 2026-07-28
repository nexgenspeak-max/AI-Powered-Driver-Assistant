import json

from openai import AsyncOpenAI

from app.config.settings import get_settings

EXTRACTION_FIELDS = [
    "sender_phone", "sender_address", "recipient_name",
    "recipient_phone", "recipient_address", "note",
]

SYSTEM_PROMPT = """Bạn là trợ lý đọc ảnh đơn giao hàng cho tài xế giao hàng ở Việt Nam. Ảnh có thể là hoá đơn, tem vận đơn, tin nhắn chụp màn hình hoặc ghi chú viết tay.
Trả lời DUY NHẤT một JSON object hợp lệ theo đúng schema sau, không thêm chữ hay giải thích nào khác:
{
  "sender_phone": string | null,
  "sender_address": string | null,
  "recipient_name": string | null,
  "recipient_phone": string | null,
  "recipient_address": string | null,
  "note": string | null
}
Quy tắc:
- Số điện thoại Việt Nam có 10 số, có thể viết dạng 0xxxxxxxxx hoặc +84xxxxxxxxx.
- Nếu một trường không đọc được hoặc không xuất hiện trong ảnh, trả về null cho trường đó — tuyệt đối không bịa thông tin.
- "note" chỉ ghi chú phụ liên quan đến việc giao hàng (ví dụ: hàng dễ vỡ, giao giờ hành chính), không lặp lại địa chỉ/số điện thoại đã điền ở trên."""


def _to_data_url(image_base64: str, mime_type: str) -> str:
    return image_base64 if image_base64.startswith("data:") else f"data:{mime_type};base64,{image_base64}"


async def extract_delivery_info(image_base64: str, mime_type: str = "image/jpeg") -> dict:
    settings = get_settings()
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not configured")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    completion = await client.chat.completions.create(
        model=settings.llm_model or "gpt-4o-mini",
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Trích xuất thông tin giao hàng từ ảnh sau:"},
                    {"type": "image_url", "image_url": {"url": _to_data_url(image_base64, mime_type)}},
                ],
            },
        ],
    )

    raw = completion.choices[0].message.content
    if not raw:
        raise RuntimeError("Empty response from vision model")

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError("Vision model did not return valid JSON")

    result = {}
    for field in EXTRACTION_FIELDS:
        value = parsed.get(field)
        result[field] = value.strip() if isinstance(value, str) and value.strip() else None
    return result
