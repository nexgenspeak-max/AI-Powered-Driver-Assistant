#!/usr/bin/env bash
# Khoi dong cac service (BE + FE web) tren macOS/Linux trong 1 terminal.
# Moi dong log co tien to [ten-service]; Ctrl+C tat tat ca.
#
#   bash run/start-all-mac.sh                    # backend + web frontend
#   bash run/start-all-mac.sh ops-service super-admin-panel   # chi chay cac service duoc liet ke
#   bash run/start-all-mac.sh driver-app         # app Expo chi chay khi goi ten
#   bash run/start-all-mac.sh --list
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

echo
echo "Da khoi dong $started service. Ctrl+C de tat tat ca."
wait
