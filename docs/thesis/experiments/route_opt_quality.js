#!/usr/bin/env node
/*
 * Đánh giá chất lượng sắp xếp thứ tự ghé (mục 5.4.4): so sánh heuristic láng giềng gần nhất + 2-opt
 * của dịch vụ (utils/twoOpt.ts) với lời giải tối ưu tìm bằng vét cạn, có ràng buộc đón trước trả.
 * Điểm đón, trả sinh ngẫu nhiên (hạt giống cố định) trong khung 15 km x 15 km quanh trung tâm TP.HCM;
 * chi phí là khoảng cách đường chim bay nhân hệ số đường vòng 1,3 (không gọi API bản đồ).
 * Ngoài ra đo thứ tự "theo danh sách" (đón và trả lần lượt từng chuyến theo thứ tự tạo) làm đường cơ sở.
 *
 * Chạy (từ src/backend/external-api-service):
 *   node ../../../docs/thesis/experiments/route_opt_quality.js
 */
require(require.resolve('ts-node', { paths: [process.cwd()] })).register({ transpileOnly: true });
const path = require('path');
const { optimizeOrder } = require(path.resolve('src/utils/twoOpt'));

let seed = 20261013;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
const CENTER = { lat: 10.7769, lng: 106.7009 };
const point = () => ({ lat: CENTER.lat + (rnd() - 0.5) * 0.135, lng: CENTER.lng + (rnd() - 0.5) * 0.137 });
const km = (a, b) => {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h)) * 1.3;
};

function instance(trips) {
  const start = point();
  const stops = [], prec = [];
  for (let t = 0; t < trips; t++) {
    stops.push(point()); prec.push(null);                 // đón
    stops.push(point()); prec.push(stops.length - 2);     // trả, phải sau đón
  }
  const fromStart = stops.map((s) => km(start, s));
  const m = stops.map((a) => stops.map((b) => km(a, b)));
  return { fromStart, m, prec };
}
const cost = (order, { fromStart, m }) => order.reduce((acc, j, i) => acc + (i ? m[order[i - 1]][j] : fromStart[j]), 0);

function bruteForce(inst) {
  const n = inst.fromStart.length;
  let best = Infinity;
  const used = new Array(n).fill(false), order = [];
  (function rec(c) {
    if (c >= best) return;
    if (order.length === n) { best = c; return; }
    for (let j = 0; j < n; j++) {
      if (used[j]) continue;
      const p = inst.prec[j];
      if (p !== null && !used[p]) continue;
      const step = order.length ? inst.m[order[order.length - 1]][j] : inst.fromStart[j];
      used[j] = true; order.push(j);
      rec(c + step);
      order.pop(); used[j] = false;
    }
  })(0);
  return best;
}

const RUNS = 200;
console.log(`runs=${RUNS} seed=20261013`);
console.log('Số chuyến | Số điểm dừng | Đúng tối ưu | Chênh lệch TB so với tối ưu | Chênh lệch lớn nhất | Theo danh sách: chênh lệch TB | Thời gian heuristic TB (ms)');
for (const trips of [2, 3, 4]) {
  let optimal = 0, gapSum = 0, gapMax = 0, naiveGap = 0, ms = 0;
  for (let r = 0; r < RUNS; r++) {
    const inst = instance(trips);
    const t0 = process.hrtime.bigint();
    const order = optimizeOrder(inst.fromStart, inst.m, inst.prec);
    ms += Number(process.hrtime.bigint() - t0) / 1e6;
    for (let i = 0; i < order.length; i++) {
      const p = inst.prec[order[i]];
      if (p !== null && order.indexOf(p) > i) throw new Error('vi phạm ràng buộc đón trước trả');
    }
    const h = cost(order, inst), opt = bruteForce(inst);
    const naive = cost([...Array(trips * 2).keys()], inst);
    const gap = (h - opt) / opt;
    if (gap < 1e-9) optimal++;
    gapSum += gap; gapMax = Math.max(gapMax, gap); naiveGap += (naive - opt) / opt;
  }
  const pct = (x) => `${(x * 100).toFixed(1)}%`;
  console.log(`${trips} | ${trips * 2} | ${optimal}/${RUNS} (${pct(optimal / RUNS)}) | ${pct(gapSum / RUNS)} | ${pct(gapMax)} | ${pct(naiveGap / RUNS)} | ${(ms / RUNS).toFixed(3)}`);
}
