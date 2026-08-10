# Cách chạy toàn bộ service (`run/start-all.ps1` hoặc `run/start-all.sh`)

## Khuyến nghị: dùng `run/start-all.ps1`

Sau khi vật lộn với `run/start-all.sh` bị lỗi WSL/Git Bash tuỳ máy (chi tiết bên dưới), kết
luận: **bản `.ps1` mới là cách chạy portable, "pull về máy nào cũng chạy được"** — vì nó dùng
`Start-Process powershell.exe` thuần Windows, không đụng tới `bash`, không phụ thuộc Git cài ở
ổ nào hay PATH hệ thống sắp xếp ra sao. Bản `.sh` phụ thuộc vào thứ tự PATH của từng máy Windows
cụ thể (xem phần "Vì sao `.sh` không portable" bên dưới) nên **không đảm bảo chạy được ngay trên
máy khác** — mỗi máy có thể cần chỉnh khác nhau.

**Chạy (PowerShell, terminal mặc định của VSCode) — đứng ở đâu cũng được, dùng đường dẫn đầy đủ:**

```powershell
powershell -ExecutionPolicy Bypass -File E:\Czen\run\start-all.ps1
```

Hoặc nếu đã đứng sẵn ở gốc repo (`cd E:\Czen`):

```powershell
powershell -ExecutionPolicy Bypass -File run\start-all.ps1
```

Không cần Git Bash, không cần biết Git cài ở đâu, không dính lỗi WSL.

## Yêu cầu trước khi chạy (áp dụng cho cả 2 bản)

- Mỗi service Node cần đã `npm install` (có `node_modules`) — nếu thiếu, script vẫn cố khởi
  động nhưng in cảnh báo `Chua thay node_modules`.
- `voice-agent` (Python) cần đã tạo `.venv` + cài `requirements.txt` tại
  `src/backend/voice-agent/.venv`. Nếu thiếu `.venv/Scripts/python.exe`, script sẽ **bỏ qua**
  service này (không tự tạo venv giúp bạn).

## Nó làm gì
Với mỗi service, script:
1. Kiểm tra thư mục service có tồn tại không — không có thì bỏ qua kèm cảnh báo.
2. Mở 1 cửa sổ console mới chạy lệnh dev tương ứng (PowerShell với bản `.ps1`, Git Bash với
   bản `.sh`).
3. Nghỉ 0.8s giữa các lần mở để tránh dồn CPU/disk khi nhiều `npm`/`node` khởi động cùng lúc.

Danh sách service & lệnh chạy:

| Service | Thư mục | Lệnh |
|---|---|---|
| auth-service | `src/backend/auth-service` | `npm run dev` |
| call-center | `src/backend/call-center` | `npm run dev` |
| call-logger | `src/backend/call-logger` | `npm run dev` |
| trip-service | `src/backend/trip-service` | `npm run dev` |
| voice-agent | `src/backend/voice-agent` | `.venv/Scripts/python.exe -m app.main dev` |
| admin-panel | `src/frontend/admin-panel` | `npm run dev` |
| customer-web | `src/frontend/customer-web` | `npm run dev` |
| driver-web | `src/frontend/driver-web` | `npm run dev` |
| agents-playground | `src/frontend/agents-playground` | `npm run dev` |
| driver-app | `src/frontend/driver-app` | `npx expo run:android` |
| customer-app | `src/frontend/customer-app` | `npm run web` |

## Dừng lại
Đóng cửa sổ console của service nào là tắt service đó — không có lệnh "stop all" chung.

## Cổng tham khảo
`auth-service:8003` · `call-center:8000` · `call-logger:8001` · `trip-service:8002` ·
`admin-panel:5173` · `customer-web:5174` · `driver-web:5175` · `agents-playground:3000` ·
`driver-app(Expo):8081` · `customer-app(Expo):8083`

## `driver-app` cần thiết bị Android

`driver-app` dùng `npx expo run:android` — cần máy ảo/thiết bị Android đã kết nối, nếu không
lệnh sẽ treo/lỗi riêng trong cửa sổ của nó (không ảnh hưởng các service khác).

---

## Vì sao `run/start-all.sh` không portable — chỉ dùng nếu quen Git Bash

Bản `.sh` yêu cầu chạy bằng **Git Bash thật sự** (không phải gõ `bash ...` từ PowerShell/cmd
mặc định), vì lý do sau:

**Gốc rễ vấn đề:** trên nhiều máy Windows, `C:\WINDOWS\system32` (chứa `bash.exe` — launcher
của WSL) đứng **trước** thư mục cài Git trong PATH hệ thống. Nếu gõ `bash run/start-all.sh` từ
PowerShell/cmd, Windows phân giải `bash` sang launcher WSL đó thay vì Git Bash → máy nào không
có distro WSL sẽ báo lỗi `WSL ... execvpe(/bin/bash) failed`. Đây **không phải lỗi trong code**,
mà là do thứ tự PATH — thay đổi tuỳ máy, tuỳ cài Git ở ổ nào, tuỳ có bật WSL hay không. Không
sửa được 1 lần cho mọi máy trong tương lai.

Script đã được vá để tự dò đường dẫn `bash.exe` thật (qua `cygpath`/`$BASH`) khi mở các cửa sổ
con, và dừng sớm với thông báo lỗi rõ ràng nếu không dò được — nhưng vẫn **không giải quyết
được** việc lệnh gốc `bash ...` gõ từ PowerShell bị Windows hiểu nhầm. Nếu vẫn muốn dùng bản
`.sh`:

**Cách 1 — từ PowerShell, gọi thẳng đường dẫn Git Bash (thay path cho đúng máy bạn):**

```powershell
cd E:\Czen
& "D:\Git\Setup\Git\bin\bash.exe" run\start-all.sh
```

⚠️ Đường dẫn `run\start-all.sh` là *tương đối theo thư mục PowerShell đang đứng* — luôn `cd` về
gốc repo trước, hoặc bỏ tiền tố `run\` nếu đã đứng sẵn trong `run/`.

**Cách 2 — mở cửa sổ Git Bash thật** (chuột phải vào thư mục repo → "Git Bash Here", hoặc mở
app "Git Bash" từ Start Menu), rồi chạy:

```bash
bash run/start-all.sh
```

Vì mỗi máy có Git cài ở vị trí khác nhau, **không thể copy nguyên văn lệnh Cách 1 giữa các máy**
— phải tự tìm `bash.exe` (thường ở `<nơi cài Git>\bin\bash.exe`, kiểm tra bằng lệnh PowerShell
`Get-Command git | Select-Object Source` để suy ra thư mục Git rồi thêm `bin\bash.exe`). Đây
chính là lý do bản `.ps1` được khuyến nghị làm mặc định.
