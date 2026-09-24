<#
  Khoi dong TOAN BO service cua du an (BE + FE) chi bang 1 lenh.
  Moi service duoc mo trong 1 cua so PowerShell rieng (co the theo doi log
  tung service doc lap, dong cua so nao la tat service do).

  Cach chay (tu thu muc goc du an, hoac tu chinh thu muc run/):
    powershell -ExecutionPolicy Bypass -File run\start-all.ps1

  Neu PowerShell chan chay script (execution policy), dung lenh Bypass o
  tren thay vi double-click truc tiep file .ps1.
#>

$ErrorActionPreference = 'Stop'

# run/ luon nam ngay duoi thu muc goc du an -> thu muc goc = cha cua $PSScriptRoot
$RepoRoot = Split-Path -Parent $PSScriptRoot

$Services = @(
    # -- Backend --------------------------------------------------------
    @{ Name = 'identity-service';  Path = 'src\backend\identity-service';  Cmd = 'npm run dev' }
    @{ Name = 'external-channel-service';   Path = 'src\backend\external-channel-service';   Cmd = 'npm run dev' }
    @{ Name = 'call-records-service';   Path = 'src\backend\call-records-service';   Cmd = 'npm run dev' }
    @{ Name = 'external-api-service';  Path = 'src\backend\external-api-service';  Cmd = 'npm run dev' }
    @{ Name = 'llm-orchestrator';   Path = 'src\backend\llm-orchestrator';   Cmd = '.venv-python' }  # xu ly rieng ben duoi

    # -- Frontend (web) ---------------------------------------------------
    @{ Name = 'admin-panel';       Path = 'src\frontend\admin-panel';       Cmd = 'npm run dev' }
    @{ Name = 'customer-web';      Path = 'src\frontend\customer-web';      Cmd = 'npm run dev' }
    @{ Name = 'driver-web';        Path = 'src\frontend\driver-web';        Cmd = 'npm run dev' }
    @{ Name = 'agents-playground'; Path = 'src\frontend\agents-playground'; Cmd = 'npm run dev' }

    # -- Frontend (mobile, Expo) -------------------------------------------
    @{ Name = 'driver-app';   Path = 'src\frontend\driver-app';   Cmd = 'npx expo run:android' }
    @{ Name = 'customer-app'; Path = 'src\frontend\customer-app'; Cmd = 'npm run web' }
)

Write-Host "Repo root: $RepoRoot" -ForegroundColor DarkGray
Write-Host "Chuan bi khoi dong $($Services.Count) service...`n" -ForegroundColor Cyan

foreach ($svc in $Services) {
    $fullPath = Join-Path $RepoRoot $svc.Path

    if (-not (Test-Path -LiteralPath $fullPath)) {
        Write-Warning "[$($svc.Name)] Bo qua - khong tim thay thu muc: $fullPath"
        continue
    }

    # llm-orchestrator chay bang python trong .venv rieng, khong phai npm
    if ($svc.Name -eq 'llm-orchestrator') {
        $venvPython = Join-Path $fullPath '.venv\Scripts\python.exe'
        if (-not (Test-Path -LiteralPath $venvPython)) {
            Write-Warning "[$($svc.Name)] Bo qua - chua thay .venv (chay 'python -m venv .venv' + cai requirements.txt truoc)"
            continue
        }
        $realCmd = "& '$venvPython' -m app.main dev"
    }
    else {
        if (-not (Test-Path -LiteralPath (Join-Path $fullPath 'node_modules'))) {
            Write-Warning "[$($svc.Name)] Chua thay node_modules - co the can 'npm install' truoc, van thu khoi dong..."
        }
        $realCmd = $svc.Cmd
    }

    Write-Host "-> Khoi dong $($svc.Name)" -ForegroundColor Green

    $innerCommand = "`$host.UI.RawUI.WindowTitle = '$($svc.Name)'; Set-Location -LiteralPath '$fullPath'; Write-Host '=== $($svc.Name) ===' -ForegroundColor Green; $realCmd"
    Start-Process powershell.exe -ArgumentList @('-NoExit', '-Command', $innerCommand)

    # Gian cach nhe de tranh ca chuc process npm/node cung khoi dong 1 luc
    # lam nghen CPU/disk -- khong anh huong toi viec service nao cung chay.
    Start-Sleep -Milliseconds 800
}

Write-Host "`nDa mo xong cac cua so. Moi service 1 cua so PowerShell rieng - dong cua so nao la tat service do." -ForegroundColor Yellow
Write-Host "Port tham khao: identity-service:8003  external-channel-service:8000  call-records-service:8001  external-api-service:8002  admin-panel:5173  customer-web:5174  driver-web:5175  agents-playground:3000  driver-app(Expo):8081  customer-app(Expo):8083" -ForegroundColor DarkGray
