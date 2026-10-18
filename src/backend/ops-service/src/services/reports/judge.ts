import { JudgeResult } from './types';
import { getLogger } from '../logger';

const log = getLogger('report_judge');

export interface Exchange {
  call_id: string;
  context: string;
  tools: string[];          // tools that succeeded in this session
  user: string;
  assistant: string;
}

export interface JudgeOptions {
  apiKey: string;
  model: string;
  fetchFn?: typeof fetch;
}

const METHOD =
  'Mô hình ngôn ngữ chấm từng cặp (câu tài xế, câu trả lời của trợ lý) trên mẫu ngẫu nhiên có hạt giống theo ngày: ' +
  'correct = trả lời đúng ý định và không đưa ra thông tin không có nguồn; incorrect = sai ý định, trả lời sai hoặc bịa; ' +
  'unclear = không đủ ngữ cảnh để kết luận. Tỷ lệ đúng = correct / (correct + incorrect).';

const SYSTEM =
  'You grade one turn of a Vietnamese in-car voice assistant for ride-hailing drivers. You get the recent context, ' +
  'the backend tools that returned data in that session, the driver utterance and the assistant reply. ' +
  'Trip, earnings, location and call figures come from those tools and you cannot see their output: do not call a ' +
  'figure invented just because it is not in the context when a matching tool ran. Verdict "correct" if the reply ' +
  'addresses what the driver asked; "incorrect" if it misunderstands the request, does the wrong action, refuses or ' +
  'fails to answer, or states facts no listed tool could have supplied; "unclear" if the context is not enough to ' +
  'decide. Answer JSON only: {"verdict":"correct|incorrect|unclear","reason":"<short, Vietnamese>"}';

/** Parallel requests in flight while grading a sample. */
const CONCURRENCY = 6;

/**
 * One LLM call per item. A single batched call over 30 items drifted: verdicts and
 * reasons landed on neighbouring items (report 2026-10-18), so items are graded alone.
 * Returns null when judging is not configured.
 */
export async function judge(items: Exchange[], opts: JudgeOptions | null): Promise<JudgeResult | null> {
  if (!opts || !opts.apiKey || !items.length) return null;
  const fetchFn = opts.fetchFn ?? fetch;
  const gradeOne = async (x: Exchange): Promise<{ verdict?: string; reason?: string }> => {
    const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: opts.model,
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: `Ngữ cảnh:\n${x.context || '(đầu phiên)'}\nCông cụ: ${x.tools.join(', ') || '(không)'}\nTài xế: ${x.user}\nTrợ lý: ${x.assistant}` },
        ],
      }),
    });
    if (!res.ok) {
      log.error('judge request failed', { ok: false, status: res.status });
      throw new Error(`judge http_${res.status}`);
    }
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    try {
      return JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
    } catch {
      return {};
    }
  };
  const results: { i: number; verdict?: string; reason?: string }[] = [];
  for (let start = 0; start < items.length; start += CONCURRENCY) {
    const batch = items.slice(start, start + CONCURRENCY);
    const graded = await Promise.all(batch.map(gradeOne));
    graded.forEach((g, k) => results.push({ i: start + k + 1, ...g }));
  }
  return tally(items, JSON.stringify({ results }), opts.model);
}

/** Pure: parse the grader output and count verdicts. Items the grader skipped count as unclear. */
export function tally(items: Exchange[], raw: string, model: string): JudgeResult {
  let results: { i: number; verdict: string; reason?: string }[] = [];
  try {
    results = (JSON.parse(raw) as { results?: typeof results }).results ?? [];
  } catch {
    results = [];
  }
  const verdicts = new Map(results.map((r) => [Number(r.i), r]));
  let correct = 0;
  let incorrect = 0;
  let unclear = 0;
  const examples: JudgeResult['examples_incorrect'] = [];
  items.forEach((x, idx) => {
    const r = verdicts.get(idx + 1);
    if (r?.verdict === 'correct') correct += 1;
    else if (r?.verdict === 'incorrect') {
      incorrect += 1;
      if (examples.length < 5) examples.push({ call_id: x.call_id, user: x.user, assistant: x.assistant, reason: r.reason ?? '' });
    } else unclear += 1;
  });
  const decided = correct + incorrect;
  return {
    method: METHOD,
    model,
    sample_size: items.length,
    correct,
    incorrect,
    unclear,
    correct_rate: decided ? Math.round((correct / decided) * 10000) / 10000 : null,
    examples_incorrect: examples,
  };
}
