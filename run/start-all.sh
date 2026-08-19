#!/usr/bin/env bash
# Khoi dong TOAN BO service cua du an (BE + FE) chi bang 1 lenh.
# Moi service duoc mo trong 1 cua so terminal rieng (co the theo doi log
# tung service doc lap, dong cua so nao la tat service do).
#
# Cach chay (Git Bash, tu thu muc goc du an hoac tu run/):
#   bash run/start-all.sh
#
# Script nay danh cho Windows + Git Bash: dung "cmd //c start" de mo moi
# service trong 1 cua so console rieng, giong ban PowerShell (start-all.ps1).

set -euo pipefail

# run/ luon nam ngay duoi thu muc goc du an -> thu muc goc = cha cua thu muc script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Tren nhieu may Windows, "C:\WINDOWS\system32" dung truoc thu muc Git trong PATH he
# thong -> goi "bash" tran se bi cmd.exe phan giai nham sang bash.exe cua WSL (launcher
# WSL), gay loi "execvpe(/bin/bash) failed" khi khong co distro WSL nao duoc cai.
# Dung dung duong dan Git Bash dang chay chinh script nay (qua $BASH) de tranh nham lan.
GIT_BASH_WIN="$(cygpath -w "$BASH" 2>/dev/null || true)"
if [ -z "$GIT_BASH_WIN" ] || [ ! -e "$GIT_BASH_WIN" ]; then
    # cygpath loi hoac khong co -> thu dung thang gia tri $BASH (co the da la
    # duong dan Windows san neu bash.exe duoc goi bang full path tu PowerShell/cmd).
    GIT_BASH_WIN="$BASH"
fi
if [ -z "$GIT_BASH_WIN" ] || [ ! -e "$GIT_BASH_WIN" ]; then
    echo "[LOI] Khong xac dinh duoc duong dan bash.exe hop le (GIT_BASH_WIN='$GIT_BASH_WIN')." >&2
    echo "      Hay chay lai bang duong dan bash.exe day du, vi du:" >&2
    echo "      & \"D:\\Git\\Setup\\Git\\bin\\bash.exe\" run/start-all.sh" >&2
    exit 1
fi

# name|relative_path|cmd
SERVICES=(    
    # -- Backend --------------------------------------------------------
    "auth-service|src/backend/auth-service|npm run dev"
    "call-center|src/backend/call-center|npm run dev"
    "call-logger|src/backend/call-logger|npm run dev"
    "trip-service|src/backend/trip-service|npm run dev"
    "voice-agent|src/backend/voice-agent|__VENV__"   # xu ly rieng ben duoi

    # -- Frontend (web) ---------------------------------------------------
    "admin-panel|src/frontend/admin-panel|npm run dev"
    "customer-web|src/frontend/customer-web|npm run dev"
    "driver-web|src/frontend/driver-web|npm run dev"
    "agents-playground|src/frontend/agents-playground|npm run dev"

    # -- Frontend (mobile, Expo) -------------------------------------------
    "driver-app|src/frontend/driver-app|npx expo run:android"
    "customer-app|src/frontend/customer-app|npm run web"
)

echo "Repo root: $REPO_ROOT"
echo "Chuan bi khoi dong ${#SERVICES[@]} service..."
echo

for entry in "${SERVICES[@]}"; do
    IFS='|' read -r name rel_path cmd <<< "$entry"
    full_path="$REPO_ROOT/$rel_path"

    if [ ! -d "$full_path" ]; then
        echo "[WARN] [$name] Bo qua - khong tim thay thu muc: $full_path" >&2
        continue
    fi

    win_path="$(cd "$full_path" && pwd -W 2>/dev/null || pwd)"

    if [ "$name" = "voice-agent" ]; then
        venv_python="$full_path/.venv/Scripts/python.exe"
        if [ ! -f "$venv_python" ]; then
            echo "[WARN] [$name] Bo qua - chua thay .venv (chay 'python -m venv .venv' + cai requirements.txt truoc)" >&2
            continue
        fi
        real_cmd="./.venv/Scripts/python.exe -m app.main dev"
    else
        if [ ! -d "$full_path/node_modules" ]; then
            echo "[WARN] [$name] Chua thay node_modules - co the can 'npm install' truoc, van thu khoi dong..." >&2
        fi
        real_cmd="$cmd"
    fi

    echo "-> Khoi dong $name"

    cmd //c start "$name" "$GIT_BASH_WIN" -lic "cd '$win_path' && echo '=== $name ===' && $real_cmd; exec '$GIT_BASH_WIN'"

    # Gian cach nhe de tranh ca chuc process npm/node cung khoi dong 1 luc
    # lam nghen CPU/disk -- khong anh huong toi viec service nao cung chay.
    sleep 0.8
done

echo
echo "Da mo xong cac cua so. Moi service 1 cua so rieng - dong cua so nao la tat service do."
echo "Port tham khao: auth-service:8003  call-center:8000  call-logger:8001  trip-service:8002  admin-panel:5173  customer-web:5174  driver-web:5175  agents-playground:3000  driver-app(Expo):8081  customer-app(Expo):8083"
