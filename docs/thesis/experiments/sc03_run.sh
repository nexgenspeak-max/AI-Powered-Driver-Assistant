#!/usr/bin/env bash
# Chạy SC-03: 4 mức người dùng ảo × 3 lần lặp, mỗi lần 45 giây. Kết quả: results/sc03_<vus>_<rep>.json
set -euo pipefail
cd "$(dirname "$0")"; mkdir -p results
for rep in 1 2 3; do
  for vus in 10 50 100 200; do
    k6 run -q -e VUS=$vus -e DURATION=45s --summary-export results/sc03_${vus}_${rep}.json sc03_trip_api.k6.js > results/sc03_${vus}_${rep}.log 2>&1 || true
    echo "done vus=$vus rep=$rep"
  done
done
