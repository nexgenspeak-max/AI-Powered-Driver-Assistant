#!/usr/bin/env bash
# Khoi dong cac service (BE + FE web) tren macOS/Linux trong 1 terminal.
# Moi dong log co tien to [ten-service]; Ctrl+C tat tat ca.
#
#   bash run/start-all-mac.sh                    # backend + web frontend
#   bash run/start-all-mac.sh ops-service super-admin-panel   # chi chay cac service duoc liet ke
#   bash run/start-all-mac.sh driver-app         # app Expo chi chay khi goi ten
#   bash run/start-all-mac.sh --list
#   IDLE_MINUTES=30 bash run/start-all-mac.sh    # tu tat sau 30 phut khong dung (0 = tat tinh nang)
#
# Tu tat khi ranh: sau IDLE_MINUTES (mac dinh 10) khong co client nao (dien thoai,
# trinh duyet, curl...) ket noi toi cong backend/Metro va llm-orchestrator khong ghi
# log phien goi nao, launcher tu tat tat ca service.
#
# Tuong thich bash 3.2 mac dinh cua macOS.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# name|relative_path|command|port|default(1 = chay khi khong truyen ten)
SERVICES=(
    "identity-service|src/backend/identity-service|npm run dev|8003|1"
    "external-channel-service|src/backend/external-channel-service|npm run dev|8000|1"
    "call-records-service|src/backend/call-records-service|npm run dev|8001|1"
    "external-api-service|src/backend/external-api-service|npm run dev|8002|1"
    "ops-service|src/backend/ops-service|npm run dev|8004|1"
    "llm-orchestrator|src/backend/llm-orchestrator|.venv/bin/python -m app.main dev|-|1"
    "admin-panel|src/frontend/admin-panel|npm run dev|5173|1"
    "customer-web|src/frontend/customer-web|npm run dev|5174|1"
    "driver-web|src/frontend/driver-web|npm run dev|5175|1"
    "super-admin-panel|src/frontend/super-admin-panel|npm run dev|5176|1"
    "agents-playground|src/frontend/agents-playground|npm run dev|3000|1"
    "driver-app|src/frontend/driver-app|npm start|8081|0"
    "customer-app|src/frontend/customer-app|npm start|8083|0"
)

if [ "${1:-}" = "--list" ]; then
    for entry in "${SERVICES[@]}"; do
        IFS='|' read -r name _ cmd port default <<< "$entry"
        printf '%-26s port=%-5s default=%s  %s\n' "$name" "$port" "$default" "$cmd"
    done
    exit 0
fi

REQUESTED=" $* "

for r in "$@"; do
    if ! printf '%s\n' "${SERVICES[@]}" | cut -d'|' -f1 | grep -qx -- "$r"; then
        echo "[LOI] Khong co service '$r'. Xem: bash run/start-all-mac.sh --list" >&2
        exit 1
    fi
done

wanted() {
    local name="$1" default="$2"
    if [ "$REQUESTED" = "  " ]; then
        [ "$default" = "1" ]
    else
        case "$REQUESTED" in *" $name "*) return 0 ;; *) return 1 ;; esac
    fi
}

# Moi job co process group rieng de Ctrl+C tat ca cay tien trinh (npm -> node).
set -m

stop_all() {
    trap - INT TERM EXIT
    echo
    echo "Dang tat cac service..."
    local pgid
    for pgid in $(jobs -p); do
        kill -TERM -- "-$pgid" 2>/dev/null
    done
    wait 2>/dev/null
    echo "Da tat."
}
trap stop_all INT TERM EXIT

started=0
for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name rel_path cmd port default <<< "$entry"
    wanted "$name" "$default" || continue
    dir="$REPO_ROOT/$rel_path"

    if [ ! -d "$dir" ]; then
        echo "[WARN] [$name] Bo qua - khong thay thu muc $rel_path" >&2
        continue
    fi
    if [ "$name" = "llm-orchestrator" ] && [ ! -x "$dir/.venv/bin/python" ]; then
        echo "[WARN] [$name] Bo qua - chua co .venv (xem src/backend/llm-orchestrator/README.md)" >&2
        continue
    fi
    if [ "$name" != "llm-orchestrator" ] && [ ! -d "$dir/node_modules" ]; then
        echo "[WARN] [$name] Bo qua - chua 'npm install'" >&2
        continue
    fi
    if [ "$port" != "-" ] && lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "[WARN] [$name] Bo qua - cong $port dang duoc dung" >&2
        continue
    fi

    label="$(printf '%-26s' "[$name]")"
    (cd "$dir" && exec $cmd) 2>&1 | awk -v p="$label" '{ print p $0; fflush() }' &
    echo "-> $name (port $port)"
    started=$((started + 1))
    sleep 0.5
done

if [ "$started" -eq 0 ]; then
    echo "Khong co service nao duoc khoi dong."
    trap - INT TERM EXIT
    exit 1
fi

IDLE_MINUTES="${IDLE_MINUTES:-10}"
IDLE_CHECK_S="${IDLE_CHECK_S:-30}"
# Frontend dev server (Vite/Next) giu websocket HMR khi tab con mo nen khong tinh.
ACTIVITY_PORTS="8000 8001 8002 8003 8004 8081 8083"
ORCH_LOG_DIR="$REPO_ROOT/src/backend/llm-orchestrator/logs"
LAUNCHER_PID=$$

# Client that khong phai service cua minh: ket noi tu may khac (dien thoai) toi cong,
# hoac tien trinh khong phai node/python (trinh duyet, curl) tren may nay.
has_client_connection() {
    local port
    for port in $ACTIVITY_PORTS; do
        lsof -nP -iTCP:"$port" -sTCP:ESTABLISHED 2>/dev/null | awk -v port="$port" '
            NR == 1 { next }
            {
                name = $9; split(name, ends, "->"); local_end = ends[1]; remote_end = ends[2]
                if (local_end ~ (":" port "$")) {
                    if (remote_end !~ /^(127\.0\.0\.1|\[::1\]):/) found = 1
                } else if ($1 != "node" && $1 !~ /^[Pp]ython/) {
                    found = 1
                }
            }
            END { exit found ? 0 : 1 }' && return 0
    done
    return 1
}

has_voice_activity() {
    [ -d "$ORCH_LOG_DIR" ] || return 1
    [ -n "$(find "$ORCH_LOG_DIR" -maxdepth 1 -name '*.log' -mmin -1 2>/dev/null | head -1)" ]
}

idle_watchdog() {
    local limit=$((IDLE_MINUTES * 60)) idle_s=0 warned=0
    while sleep "$IDLE_CHECK_S"; do
        if has_client_connection || has_voice_activity; then
            idle_s=0
            warned=0
            continue
        fi
        idle_s=$((idle_s + IDLE_CHECK_S))
        if [ "$warned" -eq 0 ] && [ $((limit - idle_s)) -le 60 ] && [ "$idle_s" -lt "$limit" ]; then
            echo "[idle-watchdog] Khong ai dung ${idle_s}s - se tu tat sau $((limit - idle_s))s"
            warned=1
        fi
        if [ "$idle_s" -ge "$limit" ]; then
            echo "[idle-watchdog] Khong ai dung trong ${IDLE_MINUTES} phut - tu tat tat ca service"
            kill -TERM "$LAUNCHER_PID"
            return
        fi
    done
}

echo
if [ "$IDLE_MINUTES" -gt 0 ] 2>/dev/null; then
    idle_watchdog &
    echo "Da khoi dong $started service. Tu tat sau ${IDLE_MINUTES} phut khong dung. Ctrl+C de tat tat ca."
else
    echo "Da khoi dong $started service. Ctrl+C de tat tat ca."
fi
wait
