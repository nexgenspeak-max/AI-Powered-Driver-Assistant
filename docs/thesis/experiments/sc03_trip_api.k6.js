// SC-03: thử tải API ngữ cảnh tài xế và cập nhật trạng thái chuyến (Dịch vụ Chuyến đi và Điều phối).
// Mỗi người dùng ảo là một tài xế giả lập (+849000000xx); mỗi vòng lặp: đọc ngữ cảnh (fresh=true)
// rồi cập nhật trạng thái một chuyến của chính tài xế đó.
// Chạy: k6 run -e BASE=http://localhost:8092 -e VUS=50 -e DURATION=45s --summary-export out.json sc03_trip_api.k6.js
import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';
const NON200 = new Counter('non_200');  // số phản hồi khác 200, để chẩn đoán
let logged = 0;  // mỗi người dùng ảo ghi tối đa 2 phản hồi lỗi
import encoding from 'k6/encoding';
import crypto from 'k6/crypto';

const BASE = __ENV.BASE || 'http://localhost:8092';
const SECRET = __ENV.JWT_SECRET || 'bench-secret';

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '45s',
  summaryTrendStats: ['med', 'p(90)', 'p(95)', 'max', 'count'],
  // ngưỡng rộng chỉ để k6 xuất số liệu riêng cho từng endpoint
  thresholds: { 'http_req_duration{ep:context}': ['p(95)<60000'], 'http_req_duration{ep:update}': ['p(95)<60000'] },
};

function b64url(s) { return encoding.b64encode(s, 'rawurl'); }
function jwt(phone) {
  const h = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const p = b64url(JSON.stringify({ sub: `bench-${phone}`, role: 'driver', permissions: [], name: 'bench', phone, type: 'access', iat: now, exp: now + 7200 }));
  const sig = crypto.hmac('sha256', SECRET, `${h}.${p}`, 'base64rawurl');
  return `${h}.${p}.${sig}`;
}

export default function () {
  const d = (__VU - 1) % 200;
  const phone = `+84900000${String(d).padStart(3, '0')}`;
  const headers = { Authorization: `Bearer ${jwt(phone)}`, 'X-Driver-Phone': phone, 'Content-Type': 'application/json' };
  const ctx = http.get(`${BASE}/api/v1/drivers/me/context?fresh=true`, { headers, tags: { ep: 'context' } });
  check(ctx, { 'context 200': (r) => r.status === 200 });
  if (ctx.status !== 200) { NON200.add(1); if (logged++ < 2) console.log(`context ${ctx.status} ${ctx.error} ${ctx.error_code}`); }
  const status = __ITER % 2 === 0 ? 'arrived_pickup' : 'confirmed';
  const up = http.patch(`${BASE}/api/v1/trips/bench-${String(d).padStart(3, '0')}-0`, JSON.stringify({ status }), { headers, tags: { ep: 'update' } });
  check(up, { 'update 200': (r) => r.status === 200 });
  if (up.status !== 200) { NON200.add(1); if (logged++ < 2) console.log(`update ${up.status} ${up.error} ${up.error_code}`); }
}
