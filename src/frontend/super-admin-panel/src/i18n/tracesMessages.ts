import type { InsightKey, InsightParams } from '../features/traces/insights'
import type { OpsLocale } from './localeRegistry'

export type TracesMessages = {
  search: string
  mode: string
  allModes: string
  status: string
  allStatus: string
  live: string
  ended: string
  stale: string
  empty: string
  loadFailed: string
  turnsN: (n: number) => string
  slowN: (n: number) => string
  errorsN: (n: number) => string
  selectSession: string
  notFound: string
  connecting: string
  disconnected: string
  model: string
  stt: string
  tts: string
  lang: string
  duration: string
  endReason: string
  stats: {
    turns: string
    llmCalls: string
    ttftAvg: string
    ttftP95: string
    totalP95: string
    slowTurns: string
    maxPrompt: string
    tokens: string
    toolErrors: string
    opErrors: string
  }
  insightsTitle: string
  noInsights: string
  insights: Record<InsightKey, (p: InsightParams) => string>
  tabs: { timeline: string; ops: string; logs: string }
  openLogs: string
  logsHint: string
  greeting: string
  turn: (n: number) => string
  noUtterance: string
  latency: { eou: string; llm: string; tts: string; total: string; slow: string }
  llmCall: (n: number) => string
  tokensInOut: (input: number | string, output: number | string) => string
  ttft: string
  callDuration: string
  prompt: string
  systemMessages: string
  sameAsPrevious: string
  history: (n: number) => string
  toolsN: (n: number) => string
  toolChoice: string
  response: string
  noResponseText: string
  noResponse: string
  toolCalls: string
  toolResults: string
  args: string
  output: string
  error: string
  spoken: string
  interrupted: string
  ops: string
  errors: string
  rawJson: string
  copyPrompt: string
  copied: string
  show: string
  hide: string
  roles: Record<'user' | 'assistant' | 'system' | 'developer' | 'function_call' | 'function_call_output', string>
  opsTable: {
    all: string
    ok: string
    failed: string
    time: string
    turn: string
    name: string
    result: string
    target: string
    duration: string
    detail: string
    empty: string
  }
  jumpToLatest: string
}

const en: TracesMessages = {
  search: 'Search room or participant',
  mode: 'Type',
  allModes: 'All types',
  status: 'Status',
  allStatus: 'All',
  live: 'Live',
  ended: 'Ended',
  stale: 'No end marker',
  empty: 'No traced sessions yet. Start a voice session (local/dev) and it appears here.',
  loadFailed: 'Could not load sessions from ops-service.',
  turnsN: n => `${n} turns`,
  slowN: n => `${n} slow`,
  errorsN: n => `${n} errors`,
  selectSession: 'Pick a session on the left to see every turn, the exact prompt sent to the LLM, and timings.',
  notFound: 'No trace file for this room yet. If the call just started, it appears within a few seconds.',
  connecting: 'Connecting…',
  disconnected: 'Disconnected — retrying',
  model: 'LLM',
  stt: 'STT',
  tts: 'TTS',
  lang: 'Language',
  duration: 'Duration',
  endReason: 'End reason',
  stats: {
    turns: 'Turns',
    llmCalls: 'LLM calls',
    ttftAvg: 'Avg LLM TTFT',
    ttftP95: 'P95 LLM TTFT',
    totalP95: 'P95 response',
    slowTurns: 'Slow turns (≥ 2 s)',
    maxPrompt: 'Largest prompt',
    tokens: 'Tokens in / out',
    toolErrors: 'Tool errors',
    opErrors: 'Failed operations',
  },
  insightsTitle: 'What to improve',
  noInsights: 'Nothing stands out in this session.',
  insights: {
    slowLlm: p => `LLM time-to-first-token P95 is ${p.ms} ms (> 2 s). Shorten the prompt or switch to a faster model.`,
    slowTurns: p => `${p.n}/${p.total} turns took ≥ 2 s to first audio (P95 ${p.ms} ms). Check the latency bar on each slow turn to see whether STT, LLM or TTS is the cause.`,
    slowEou: p => `End-of-utterance wait P95 is ${p.ms} ms. Tune turn detection / endpointing delay.`,
    slowTts: p => `TTS time-to-first-byte P95 is ${p.ms} ms. Try a faster voice/model or stream shorter sentences.`,
    bigPrompt: p => `A prompt reached ${p.n} tokens (> 6000). Trim the trip context or chat history sent each turn.`,
    toolErrors: p => `Tools failed ${p.n} time(s): ${p.names}. Open the tool results to see the arguments and error.`,
    httpErrors: p => `${p.n} backend HTTP call(s) failed. See the Ops tab for path and status.`,
    llmErrors: p => `The LLM returned an error ${p.n} time(s).`,
    agentErrors: p => `The agent logged ${p.n} error(s). See the Ops tab.`,
    emptyResponse: p => `${p.n} LLM response(s) had no text and no tool call — the driver heard nothing.`,
    fillers: p => `Filler phrase played ${p.n} time(s) over ${p.total} turns — the real answer was slow to start.`,
    interruptions: p => `The driver interrupted the assistant ${p.n} time(s). Answers may be too long.`,
    repeatedQuestion: p => `The driver repeated a question ${p.n} time(s) — the previous answer probably missed.`,
    fallbacks: p => `Switched to a backup provider ${p.n} time(s).`,
  },
  tabs: { timeline: 'Timeline', ops: 'Ops', logs: 'Logs' },
  openLogs: 'Open logs for this room',
  logsHint: 'Raw service logs (all services) filtered by this room id, live.',
  greeting: 'Greeting (before the first utterance)',
  turn: n => `Turn ${n}`,
  noUtterance: 'No transcript',
  latency: { eou: 'End of speech', llm: 'LLM TTFT', tts: 'TTS TTFB', total: 'Total', slow: 'Slow' },
  llmCall: n => `LLM call #${n}`,
  tokensInOut: (input, output) => `${input} in / ${output} out tokens`,
  ttft: 'TTFT',
  callDuration: 'Duration',
  prompt: 'Prompt sent to the LLM',
  systemMessages: 'System instructions',
  sameAsPrevious: 'Same as previous call',
  history: n => `Conversation (${n} items)`,
  toolsN: n => `Tools offered (${n})`,
  toolChoice: 'tool_choice',
  response: 'LLM response',
  noResponseText: '(no text)',
  noResponse: 'No response recorded yet',
  toolCalls: 'Tool calls',
  toolResults: 'Tool results',
  args: 'Arguments',
  output: 'Output',
  error: 'Error',
  spoken: 'Spoken to the driver',
  interrupted: 'interrupted',
  ops: 'Operations',
  errors: 'Errors',
  rawJson: 'Raw JSON',
  copyPrompt: 'Copy prompt',
  copied: 'Copied',
  show: 'Show',
  hide: 'Hide',
  roles: {
    user: 'Driver',
    assistant: 'Assistant',
    system: 'System',
    developer: 'Developer',
    function_call: 'Tool call',
    function_call_output: 'Tool output',
  },
  opsTable: {
    all: 'All',
    ok: 'OK',
    failed: 'Failed',
    time: 'Time',
    turn: 'Turn',
    name: 'Event',
    result: 'Result',
    target: 'Path / status',
    duration: 'ms',
    detail: 'Details',
    empty: 'No operations recorded.',
  },
  jumpToLatest: 'Jump to latest turn',
}

const vi: TracesMessages = {
  search: 'Tìm room hoặc người tham gia',
  mode: 'Loại',
  allModes: 'Mọi loại',
  status: 'Trạng thái',
  allStatus: 'Tất cả',
  live: 'Đang diễn ra',
  ended: 'Đã kết thúc',
  stale: 'Không có dấu kết thúc',
  empty: 'Chưa có phiên nào được ghi trace. Bắt đầu một phiên thoại (local/dev) là sẽ hiện ở đây.',
  loadFailed: 'Không tải được danh sách phiên từ ops-service.',
  turnsN: n => `${n} lượt`,
  slowN: n => `${n} chậm`,
  errorsN: n => `${n} lỗi`,
  selectSession: 'Chọn một phiên bên trái để xem từng lượt, prompt gửi sang LLM và thời gian phản hồi.',
  notFound: 'Chưa có file trace cho room này. Nếu cuộc gọi vừa bắt đầu, vài giây nữa sẽ hiện.',
  connecting: 'Đang kết nối…',
  disconnected: 'Mất kết nối — đang thử lại',
  model: 'LLM',
  stt: 'STT',
  tts: 'TTS',
  lang: 'Ngôn ngữ',
  duration: 'Thời lượng',
  endReason: 'Lý do kết thúc',
  stats: {
    turns: 'Lượt nói',
    llmCalls: 'Lần gọi LLM',
    ttftAvg: 'LLM TTFT TB',
    ttftP95: 'LLM TTFT P95',
    totalP95: 'Phản hồi P95',
    slowTurns: 'Lượt chậm (≥ 2 giây)',
    maxPrompt: 'Prompt lớn nhất',
    tokens: 'Token vào / ra',
    toolErrors: 'Lỗi công cụ',
    opErrors: 'Thao tác lỗi',
  },
  insightsTitle: 'Nên cải thiện',
  noInsights: 'Phiên này không có điểm bất thường.',
  insights: {
    slowLlm: p => `LLM TTFT P95 là ${p.ms} ms (> 2 giây) → giảm prompt hoặc đổi model nhanh hơn.`,
    slowTurns: p => `${p.n}/${p.total} lượt mất ≥ 2 giây mới có tiếng (P95 ${p.ms} ms). Xem thanh độ trễ ở từng lượt chậm để biết do STT, LLM hay TTS.`,
    slowEou: p => `Chờ hết câu (EOU) P95 là ${p.ms} ms → chỉnh turn detection / endpointing.`,
    slowTts: p => `TTS TTFB P95 là ${p.ms} ms → thử giọng/model nhanh hơn hoặc nói câu ngắn hơn.`,
    bigPrompt: p => `Có prompt lên tới ${p.n} token (> 6000) → cắt bớt context chuyến hoặc lịch sử hội thoại gửi mỗi lượt.`,
    toolErrors: p => `Công cụ lỗi ${p.n} lần: ${p.names}. Mở kết quả công cụ để xem tham số và lỗi.`,
    httpErrors: p => `${p.n} lần gọi HTTP sang backend bị lỗi. Xem tab Ops để biết path và status.`,
    llmErrors: p => `LLM trả lỗi ${p.n} lần.`,
    agentErrors: p => `Agent ghi ${p.n} lỗi. Xem tab Ops.`,
    emptyResponse: p => `${p.n} lần LLM trả lời rỗng (không có chữ, không gọi công cụ) — tài xế không nghe được gì.`,
    fillers: p => `Câu đệm phát ${p.n} lần trên ${p.total} lượt — câu trả lời thật bắt đầu chậm.`,
    interruptions: p => `Tài xế ngắt lời trợ lý ${p.n} lần → câu trả lời có thể quá dài.`,
    repeatedQuestion: p => `Tài xế hỏi lặp lại ${p.n} lần → câu trả lời trước có thể chưa đúng ý.`,
    fallbacks: p => `Chuyển sang nhà cung cấp dự phòng ${p.n} lần.`,
  },
  tabs: { timeline: 'Dòng thời gian', ops: 'Ops', logs: 'Logs' },
  openLogs: 'Mở log của room này',
  logsHint: 'Log thô của mọi dịch vụ, lọc theo room này, cập nhật trực tiếp.',
  greeting: 'Lời chào (trước câu nói đầu tiên)',
  turn: n => `Lượt ${n}`,
  noUtterance: 'Không có lời thoại',
  latency: { eou: 'Hết câu', llm: 'LLM TTFT', tts: 'TTS TTFB', total: 'Tổng', slow: 'Chậm' },
  llmCall: n => `Lần gọi LLM #${n}`,
  tokensInOut: (input, output) => `${input} token vào / ${output} token ra`,
  ttft: 'TTFT',
  callDuration: 'Thời gian',
  prompt: 'Prompt gửi sang LLM',
  systemMessages: 'Chỉ dẫn hệ thống',
  sameAsPrevious: 'Giống lần gọi trước',
  history: n => `Hội thoại (${n} mục)`,
  toolsN: n => `Công cụ được cung cấp (${n})`,
  toolChoice: 'tool_choice',
  response: 'LLM trả lời',
  noResponseText: '(không có chữ)',
  noResponse: 'Chưa có phản hồi',
  toolCalls: 'Gọi công cụ',
  toolResults: 'Kết quả công cụ',
  args: 'Tham số',
  output: 'Kết quả',
  error: 'Lỗi',
  spoken: 'Đã nói với tài xế',
  interrupted: 'bị ngắt lời',
  ops: 'Thao tác',
  errors: 'Lỗi',
  rawJson: 'JSON thô',
  copyPrompt: 'Sao chép prompt',
  copied: 'Đã sao chép',
  show: 'Hiện',
  hide: 'Ẩn',
  roles: {
    user: 'Tài xế',
    assistant: 'Trợ lý',
    system: 'Hệ thống',
    developer: 'Developer',
    function_call: 'Gọi công cụ',
    function_call_output: 'Kết quả công cụ',
  },
  opsTable: {
    all: 'Tất cả',
    ok: 'OK',
    failed: 'Lỗi',
    time: 'Thời điểm',
    turn: 'Lượt',
    name: 'Sự kiện',
    result: 'Kết quả',
    target: 'Path / status',
    duration: 'ms',
    detail: 'Chi tiết',
    empty: 'Chưa có thao tác nào.',
  },
  jumpToLatest: 'Tới lượt mới nhất',
}

export const TRACES_MESSAGES: Record<OpsLocale, TracesMessages> = { en, vi }
