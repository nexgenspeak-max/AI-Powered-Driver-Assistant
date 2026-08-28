# 01 — Kế hoạch nâng cấp lên production/scale thật

> File này trả lời câu hỏi: **"Khi hệ thống bắt đầu có traffic/khách hàng thật (hoặc rủi ro/yêu cầu tăng lên), cần nâng cấp những gì so với [`00_PLAN.md`](00_PLAN.md)?"**
> Đây **không phải checklist làm ngay** — mỗi mục có **điều kiện kích hoạt** riêng. Đừng làm trước điều kiện, vì phần lớn các mục ở đây tốn tiền cố định hằng tháng (NAT Gateway, multi-account, WAF...) hoặc tốn công sức không tương xứng khi chưa có traffic thật. Khi điều kiện xảy ra, chuyển mục đó sang checklist đang làm ở `00_PLAN.md`.

## Cách đọc file này

Mỗi mục có 3 phần: **Vấn đề ở quy mô nhỏ** (tại sao `00_PLAN.md` chưa cần) → **Điều kiện kích hoạt** (khi nào bắt đầu làm) → **Việc cần làm**.

Nguyên tắc chọn điều kiện kích hoạt: ưu tiên **rủi ro/dữ liệu/compliance thật** (có dữ liệu khách hàng thật, có audit, có SLA...) làm driver chính — số liệu như "số người deploy" hay "số service" chỉ là tín hiệu phụ, không phải lý do đủ để tự nó kích hoạt 1 mục.

## Scale Trigger Matrix — nhìn nhanh toàn bộ

| # | Mục | Điều kiện kích hoạt chính | Chi phí/công sức khi làm | Trạng thái |
|---|---|---|---|---|
| 1 | Private subnet + NAT Gateway | Audit bảo mật / compliance yêu cầu cách ly mạng | ~$32-35/tháng (NAT Gateway) hoặc rẻ hơn với NAT Instance | Chưa kích hoạt |
| 2 | Multi-account (AWS Organizations) | Prod có dữ liệu khách hàng thật cần cách ly blast-radius nghiêm ngặt | Overhead quản lý billing/IAM riêng theo account | Chưa kích hoạt |
| 3 | IAM & Security hardening (CloudTrail, GuardDuty, permission boundary) | Prod có dữ liệu người dùng thật, hoặc yêu cầu compliance | Thấp — nên bật CloudTrail sớm vì rẻ | Chưa kích hoạt |
| 4 | WAF | API/CloudFront bắt đầu nhận traffic công khai thật | ~$5-10/tháng + $1/rule + $0.60/1M request | Chưa kích hoạt |
| 5 | Secrets Manager rollout đầy đủ | Bắt đầu CI/CD, hoặc có người thứ 2 deploy | Công sức viết lại cách đọc secret ở mỗi service | Chưa kích hoạt |
| 6 | DB backup/restore/migration | Có dữ liệu người dùng thật trong DynamoDB | ~$0.20/GB/tháng (PITR) | Chưa kích hoạt |
| 7 | CI/CD nâng cao (canary/blue-green) | User thật dùng liên tục, không chịu được downtime dù ngắn | Công sức thiết lập CodeDeploy/alias routing | Chưa kích hoạt |
| 8 | Observability đầy đủ (SLO/tracing/dashboard) | Có phàn nàn về tốc độ/ổn định mà log hiện tại không định vị được | Chi phí X-Ray/dashboard thấp, chủ yếu tốn công thiết lập | Chưa kích hoạt |
| 9 | Capacity planning + load testing | Chuẩn bị bật auto scaling, hoặc từng nghi ngờ giới hạn hệ thống | Công sức chạy test, gần như không tốn AWS cost thêm | Chưa kích hoạt |
| 10 | Auto scaling | Traffic thật dao động rõ rệt theo giờ/ngày, hoặc từng quá tải | Chi phí biến thiên theo scale thật | Chưa kích hoạt |
| 11 | Disaster Recovery (RTO/RPO) | Có SLA cam kết với khách hàng/đối tác | Chi phí cross-region backup + công sức runbook/test | Chưa kích hoạt |
| 12 | Frontend at scale (domain, versioned release) | Có domain thật, cần zero-downtime release | Thấp — chủ yếu công sức thiết lập | Chưa kích hoạt |
| 13 | Cost governance (tagging, budgets) | Chi phí vượt mức dễ nhớ bằng mắt, hoặc nhiều team/service hơn | Thấp, chủ yếu công sức gắn tag | Chưa kích hoạt |

> Khi 1 mục được kích hoạt: đổi "Trạng thái" thành `Đã kích hoạt — YYYY-MM-DD, tracked ở 00_PLAN.md`. **Không xoá dòng khỏi bảng này** dù đã làm xong — đây là nơi lưu lại vĩnh viễn "vì sao architecture được nâng cấp", còn việc thực thi cụ thể thuộc `00_PLAN.md` (xem "Cách mở rộng file này" ở cuối).

---

## 1. Network — Private subnet + NAT Gateway cho ECS

**Vấn đề ở quy mô nhỏ:** `voice-agent` hiện chạy ở public subnet, `AssignPublicIp: ENABLED` — task có IP public trực tiếp, không qua NAT. Điều này hoạt động tốt và **không sai** ở quy mô 1 service, traffic thấp.

**Điều kiện kích hoạt:** có audit bảo mật/compliance yêu cầu cách ly mạng (khách hàng doanh nghiệp, chứng chỉ SOC2, dữ liệu nhạy cảm đi qua nội bộ...). **Không dùng "có bao nhiêu service nói chuyện nội bộ" làm điều kiện** — số lượng service không phải lý do bảo mật thật; 1 service duy nhất xử lý dữ liệu nhạy cảm vẫn có thể cần cách ly, trong khi nhiều service chỉ xử lý dữ liệu test thì không cần.

**Việc cần làm:**
```
Internet → ALB (public subnet) → ECS task (private subnet) → NAT Gateway → Internet (outbound: gọi OpenAI/LiveKit...)
```
- Tạo 2 subnet private mới (hoặc dùng subnet private có sẵn nếu VPC đã có)
- NAT Gateway đặt ở public subnet, route table của private subnet trỏ qua NAT
- Đổi `AssignPublicIp: ENABLED` → `DISABLED`, `Subnets` của `ECSService`/`VisionApiService` trỏ sang subnet private, giữ nguyên ALB ở public subnet
- **Chi phí phát sinh cố định:** NAT Gateway ~$32-35/tháng + $0.045/GB data processed — cân nhắc dùng **NAT Instance** (EC2 nhỏ) thay NAT Gateway nếu traffic thấp, rẻ hơn đáng kể ở quy mô nhỏ-vừa

## 2. Multi-account (AWS Organizations)

**Vấn đề ở quy mô nhỏ:** 1 account chung cho `dev`/`prod` (phân biệt bằng prefix `dev-`/`prod-` trong tên stack) tạo rủi ro nhỏ (lỗi IAM ở dev có thể chạm tới prod) nhưng đổi lại đơn giản, không tốn overhead quản lý billing/IAM riêng.

**Điều kiện kích hoạt chính:** `prod` bắt đầu có **dữ liệu khách hàng thật** cần cách ly blast-radius nghiêm ngặt (compliance, hợp đồng với khách hàng doanh nghiệp...). Số người deploy nhiều hơn 1 chỉ là **tín hiệu phụ** làm tăng khả năng cần multi-account sớm hơn (dễ thao tác nhầm hơn), **không tự nó là lý do đủ** — 1 người vẫn có thể cần tách account nếu prod xử lý PII thật; ngược lại vài người cùng làm trên dữ liệu test thì chưa cần.

**Việc cần làm:**
- Tạo AWS Organizations, tách account `czen-prod` riêng khỏi account dev hiện tại
- Dùng cross-account IAM Role cho CI/CD assume vào đúng account theo environment
- Billing tách riêng theo account — dễ theo dõi chi phí prod vs dev hơn nhiều so với lọc theo tag trong 1 account

## 3. IAM & Security hardening

**Vấn đề ở quy mô nhỏ:** policy least-privilege ở `00_PLAN.md` mục 4 là đủ để 1 người deploy an toàn. Chưa cần audit trail/detection tự động.

**Điều kiện kích hoạt:** có prod với dữ liệu người dùng thật, hoặc yêu cầu compliance.

**Việc cần làm:**
- Bật **CloudTrail** (ghi mọi API call trong account) — nên bật từ sớm vì chi phí thấp, nhưng chỉ *cần* nghiêm ngặt khi có prod
- **AWS Config** — theo dõi drift cấu hình so với template
- **GuardDuty** — phát hiện hành vi bất thường (credential bị lộ, truy cập lạ)
- **Permission boundary** cho IAM role của CI/CD — chặn kể cả khi policy bị cấu hình sai cũng không vượt quá giới hạn cứng
- **VPC Flow Logs** nếu đã chuyển sang private subnet (mục 1)
- Rotate `JWT_SECRET`/API key định kỳ — xem thiết kế chi tiết ở mục 5 (không đơn giản là "bật rotation")

## 4. WAF cho API Gateway/CloudFront

**Vấn đề ở quy mô nhỏ:** chưa có traffic công khai đáng kể, rủi ro bị tấn công thấp; WAF có phí cố định (~$5-10/tháng + $1/rule + $0.60/1M request).

**Điều kiện kích hoạt:** API Gateway/CloudFront public-facing bắt đầu nhận traffic từ user thật (không chỉ nội bộ test).

**Việc cần làm:** gắn AWS WAF vào API Gateway (auth-service, trip-service...) và CloudFront (frontend) — rule cơ bản: rate limiting theo IP, chặn common exploit pattern (AWS Managed Rules — Core rule set).

## 5. Secrets Manager — rollout đầy đủ {#secrets}

**Vấn đề ở quy mô nhỏ:** `.env.dev` local (đã nêu ở `00_PLAN.md` mục 6) đủ dùng khi 1 người deploy tay.

**Điều kiện kích hoạt:** bắt đầu làm CI/CD (mục 8 của `00_PLAN.md`) HOẶC có người thứ 2 deploy.

**Việc cần làm:**
- Tạo secret theo path rõ ràng, có ownership:
  ```
  /dev/auth-service/JWT_SECRET
  /dev/trip-service/JWT_SECRET      (cùng giá trị — Secrets Manager hỗ trợ resource policy chia sẻ)
  /dev/voice-agent/JWT_SECRET
  /dev/voice-agent/OPENAI_API_KEY
  /dev/voice-agent/ELEVENLABS_API_KEY
  ...
  /prod/... (namespace riêng, giá trị riêng — KHÔNG tái dùng giá trị dev)
  ```
- Lambda/ECS đọc secret **tại runtime** qua IAM permission (`secretsmanager:GetSecretValue` giới hạn đúng ARN cần), không phải qua biến môi trường do CI/CD set — luồng đúng:
  ```
  CI/CD deploy code/infra (không cầm secret value)
        ↓
  Lambda/ECS có IAM role đọc Secrets Manager
        ↓
  Runtime tự gọi GetSecretValue khi cần
  ```

**Thiết kế rotation cho `JWT_SECRET` — không đơn giản là "bật tính năng":**
Đổi thẳng giá trị `JWT_SECRET` sẽ làm **mọi access/refresh token đang tồn tại bị invalid ngay lập tức** → toàn bộ user bị đăng xuất đột ngột (auth-service/trip-service/voice-agent đều verify bằng đúng 1 secret). Cần thiết kế key versioning trước khi bật rotation tự động:
- Thêm claim `kid` (key id) vào JWT header khi ký token mới
- `auth-service` (nơi verify) chấp nhận **đồng thời nhiều secret hợp lệ** trong 1 giai đoạn chồng lấp (map `kid → secret`, tra đúng secret theo `kid` của token), không chỉ 1 secret cứng
- Quy trình rotate: sinh secret mới với `kid` mới → deploy `auth-service` chấp nhận cả 2 `kid` → chuyển việc ký token mới sang secret mới → đợi hết thời gian sống của access+refresh token cũ (dựa theo `JWT_REFRESH_EXPIRES_IN`, hiện `30d`) → gỡ secret cũ khỏi danh sách chấp nhận
- Chỉ sau khi có cơ chế này mới nên gắn Lambda rotation function tự động cho Secrets Manager — bật rotation tự động trước khi có key versioning sẽ tự gây ra sự cố đăng xuất hàng loạt định kỳ

## 6. Database backup, restore & migration strategy

**Vấn đề ở quy mô nhỏ:** chưa có dữ liệu quan trọng cần bảo vệ (toàn bộ đang là dữ liệu test).

**Điều kiện kích hoạt:** có dữ liệu người dùng thật trong DynamoDB (`AccountsTable`, `TripsTable`, `DriverSettingsTable`, `DeliveryOrdersTable`, `CallRecordsTable`).

**Việc cần làm:**
- Bật **Point-in-Time Recovery (PITR)** cho từng bảng DynamoDB — restore về bất kỳ thời điểm nào trong 35 ngày gần nhất, chi phí thấp (~$0.20/GB/tháng thêm)
- Bật **on-demand backup** định kỳ (daily) cho bảng quan trọng, lưu riêng ngoài PITR window nếu cần giữ lâu hơn 35 ngày
- **Test restore thật** ít nhất 1 lần (không chỉ bật tính năng rồi tin nó chạy) — restore ra bảng tạm, verify dữ liệu đúng
- **Data migration strategy**: DynamoDB không có schema cứng nên "migration" ở đây là **thay đổi hình dạng dữ liệu đã lưu** (đổi tên field, thêm field bắt buộc...) — cần viết script backfill chạy 1 lần (Lambda hoặc script Node/Python đọc-sửa-ghi qua toàn bộ item), **không** đổi code đọc dữ liệu theo field mới trước khi backfill xong, tránh đọc `undefined`
- Document rõ: bảng nào là **source of truth** cho dữ liệu gì, tránh trùng lặp giữa `trip-service`/`call-logger`

## 7. CI/CD nâng cao — canary/blue-green, smoke test tự động

**Vấn đề ở quy mô nhỏ:** deploy thẳng (`force-new-deployment`) + kiểm tra tay sau deploy (đã mô tả ở `00_PLAN.md` mục 7) là đủ khi downtime vài giây không ảnh hưởng user thật.

**Điều kiện kích hoạt:** có user thật đang dùng liên tục, không chấp nhận được downtime dù ngắn.

**Việc cần làm:**
- ECS: chuyển sang **CodeDeploy blue/green** cho ECS service — deploy song song version mới, chuyển traffic dần qua ALB, tự rollback nếu CloudWatch alarm đỏ trong X phút
- Lambda: dùng **alias + weighted routing** (canary 10% traffic → version mới trước khi chuyển 100%)
- Thêm **smoke test tự động** sau mỗi deploy trong workflow (gọi vài endpoint quan trọng, assert response), fail thì tự trigger rollback (lệnh đã có ở `00_PLAN.md` mục 7) thay vì chờ người phát hiện

## 8. Observability đầy đủ — SLO, dashboard, tracing

**Vấn đề ở quy mô nhỏ:** vài CloudWatch alarm cơ bản (mục 10 của `00_PLAN.md`) đủ để biết "có lỗi hay không". Chưa cần biết "chậm bao nhiêu", "đang nghẽn ở đâu".

**Điều kiện kích hoạt:** có báo cáo user phàn nàn về tốc độ/độ ổn định mà log hiện tại không đủ để định vị nguyên nhân.

**Việc cần làm:**
- Định nghĩa **SLO** cụ thể (ví dụ: 99% request `trip-service` < 500ms, uptime 99.5%/tháng)
- Metrics đầy đủ theo service:
  | Nhóm | Metrics |
  |---|---|
  | API Gateway | 4xx/5xx rate, latency p50/p95/p99, request count |
  | Lambda | Errors, Duration, Throttles, ConcurrentExecutions |
  | ECS | CPUUtilization, MemoryUtilization, RunningTaskCount, restart count |
  | DynamoDB | ConsumedRead/WriteCapacity, ThrottledRequests |
- **AWS X-Ray** — distributed tracing để thấy request đi qua auth → trip → voice-agent mất bao lâu ở mỗi chặng
- Dashboard tổng hợp (CloudWatch Dashboard hoặc Grafana) — 1 màn hình nhìn được sức khoẻ toàn hệ thống
- Alarm phải có **action rõ ràng**, không chỉ báo: `Alarm → SNS → Slack/PagerDuty → runbook (link tới đúng mục rollback ở 00_PLAN.md mục 7)`

## 9. Capacity planning & load testing

**Vấn đề ở quy mô nhỏ:** chưa biết hệ thống chịu được bao nhiêu traffic thật — quyết định auto scaling (mục 10) nếu làm trước bước này sẽ chỉ là đoán, không dựa trên số liệu.

**Điều kiện kích hoạt:** chuẩn bị bật auto scaling thật (mục 10), hoặc từng nghi ngờ/gặp giới hạn hệ thống (voice-agent lag, API chậm khi nhiều request cùng lúc...).

**Việc cần làm:**
- Chạy **load test** có kịch bản thật (không phải chỉ "spam request") bằng công cụ như k6, Artillery, hoặc Locust — mô phỏng đúng luồng chính: tạo trip → dispatch → gọi voice-agent → cập nhật status
- Đo baseline: bao nhiêu request/giây thì Lambda bắt đầu throttle, ECS task bắt đầu CPU > 80%, DynamoDB bắt đầu bị `ThrottledRequests`
- Test riêng `voice-agent`: bao nhiêu cuộc gọi đồng thời thì 1 ECS task (hiện `DesiredCount: 1`) bắt đầu tăng latency STT/TTS rõ rệt — đây là con số quan trọng nhất để quyết định ngưỡng auto scaling, vì mỗi task xử lý cuộc gọi thoại real-time, không giống Lambda scale ngang dễ dàng
- Từ số liệu đo được mới viết policy auto scaling cụ thể ở mục 10 (ngưỡng CPU, min/max task) — không dùng số mặc định đoán trước

## 10. Auto scaling

**Vấn đề ở quy mô nhỏ:** `DesiredCount: 1` cho ECS, Lambda tự scale theo request (không cần cấu hình gì thêm) — đủ cho traffic dev.

**Điều kiện kích hoạt:** đã có số liệu từ mục 9 (capacity/load test), và traffic thật dao động rõ rệt theo giờ/ngày (ví dụ giờ cao điểm gọi xe), hoặc từng bị quá tải.

**Việc cần làm:**
- ECS Service Auto Scaling: policy theo `CPUUtilization`/`RequestCountPerTarget` với ngưỡng lấy từ mục 9, min 2 (để có failover, không phải vì scale) – max theo ngân sách
- Lambda: cấu hình **Reserved Concurrency** cho function quan trọng để tránh 1 service ngốn hết concurrency chung của account, **Provisioned Concurrency** nếu cold-start ảnh hưởng UX (voice call cần latency thấp)
- DynamoDB: chuyển từ on-demand sang provisioned + auto scaling nếu traffic ổn định và muốn tối ưu chi phí (on-demand đơn giản hơn, phù hợp traffic khó đoán)

## 11. Disaster Recovery — RTO/RPO

**Vấn đề ở quy mô nhỏ:** nếu mất dữ liệu/service hiện tại, ảnh hưởng chỉ là 1 người phải deploy lại — chấp nhận được.

**Điều kiện kích hoạt:** có SLA cam kết với khách hàng/đối tác.

**Việc cần làm:**
- Định nghĩa **RTO** (Recovery Time Objective — chấp nhận downtime bao lâu) và **RPO** (Recovery Point Objective — chấp nhận mất dữ liệu bao lâu) bằng số cụ thể, không phải "càng nhanh càng tốt"
- Cross-region backup cho DynamoDB (Global Tables nếu cần active-active, hoặc backup export sang region khác nếu chỉ cần cold standby)
- Runbook DR: các bước cụ thể để dựng lại toàn hệ thống ở region khác nếu region chính sập — dùng đúng `infra/*/deploy.sh` + template đã có sẵn là lợi thế lớn (đã là IaC), chỉ cần đổi `AWS_REGION`
- **Test DR thật** định kỳ (không chỉ viết runbook rồi để đó)

## 12. Frontend at scale

**Vấn đề ở quy mô nhỏ:** S3 + CloudFront + OAC (đã có trong `00_PLAN.md` mục 9) là kiến trúc đúng ngay từ đầu, không cần đổi gì về mặt hạ tầng.

**Điều kiện kích hoạt:** có domain thật, cần zero-downtime release cho frontend.

**Việc cần làm:**
- Custom domain qua Route 53 + ACM certificate (region `us-east-1` bắt buộc cho CloudFront)
- **Versioned deploy — bắt đầu từ cách đơn giản:** mỗi build lên 1 prefix S3 riêng (`/releases/<sha>/`), đổi **Origin Path** của CloudFront distribution trỏ sang prefix mới sau khi build xong — rollback = đổi Origin Path trở lại prefix cũ, không cần build lại. Cách này đủ dùng ở phần lớn quy mô, không cần thêm hạ tầng edge compute.
- **Lambda@Edge/CloudFront Function (tùy chọn nâng cao, không phải mặc định):** chỉ cân nhắc khi cần routing phức tạp hơn (A/B test theo header/cookie, chọn version theo user...) — thêm độ trễ và độ phức tạp vận hành, đánh đổi không đáng nếu chỉ cần rollback đơn giản như trên
- Cache policy tách theo file loại (HTML: no-cache, JS/CSS có hash tên file: cache dài hạn)

## 13. Cost governance ở quy mô lớn hơn

**Vấn đề ở quy mô nhỏ:** 1 billing alarm tổng (đã có ở `00_PLAN.md` mục 10) đủ để tránh bất ngờ.

**Điều kiện kích hoạt:** chi phí hàng tháng vượt mức dễ nhớ bằng mắt, hoặc có nhiều team/service hơn cần phân bổ chi phí riêng.

**Việc cần làm:**
- **Resource tagging** bắt buộc (`Project`, `Environment`, `Service`, `Owner`) trên mọi resource — dùng Cost Allocation Tags để tách chi phí theo service trong billing
- **AWS Budgets** chi tiết theo service/tag, không chỉ 1 alarm tổng
- Cân nhắc **Savings Plans/Reserved Capacity** cho ECS Fargate nếu `voice-agent` chạy 24/7 ổn định lâu dài (tiết kiệm ~20-30% so với on-demand)

## 14. Production readiness — Required vs Conditional

**Không phải checklist tuyệt đối "production = tick hết"** — mâu thuẫn với nguyên tắc trigger ở đầu file nếu đọc như vậy. Mỗi hạng mục chỉ **Required** khi điều kiện của nó xảy ra thật (tham chiếu đúng mục ở trên); nếu điều kiện chưa xảy ra thì hạng mục đó **Conditional** — biết để chuẩn bị, chưa bắt buộc làm.

**Infrastructure**

| Hạng mục | Bắt buộc khi nào (Required when) |
|---|---|
| Multi-AZ cho tầng chịu traffic chính | SLA yêu cầu high-availability (mục 11) |
| Private subnet cho compute nội bộ (mục 1) | Audit bảo mật/compliance yêu cầu cách ly mạng |
| Backup + restore đã test thật (mục 6) | Có dữ liệu người dùng thật trong DynamoDB |
| TLS/custom domain (mục 12) | Có domain thật phục vụ user |
| WAF (mục 4) | Public traffic/risk đủ lớn |
| Security group review định kỳ | Luôn nên làm định kỳ một khi có prod — không chờ trigger riêng |

**Deployment**

| Hạng mục | Bắt buộc khi nào |
|---|---|
| CI/CD cho cả 5 service (00_PLAN.md mục 8) | Ngay khi bắt đầu có > 1 service cần deploy thường xuyên — không chờ scale |
| Approval gate cho `prod` | Ngay khi `prod` tồn tại |
| Health check + smoke test tự động (mục 7) | User thật dùng liên tục, không chịu được downtime |
| Rollback đã test thật (00_PLAN.md mục 7 + mục 7 ở đây) | Ngay khi có deploy tự động (CI/CD) — Conditional trước đó, chỉ cần rollback tay |

**Security**

| Hạng mục | Bắt buộc khi nào |
|---|---|
| IAM least-privilege + permission boundary (mục 3) | Luôn required, không chờ trigger — đã áp dụng từ `00_PLAN.md` mục 4 |
| Secrets Manager + key versioning cho JWT rotation (mục 5) | Bắt đầu CI/CD hoặc có người thứ 2 deploy |
| CloudTrail + GuardDuty (mục 3) | Prod có dữ liệu người dùng thật, hoặc yêu cầu compliance |
| Không có credential trong git history | Luôn required — kiểm tra định kỳ, không chờ trigger |

**Observability**

| Hạng mục | Bắt buộc khi nào |
|---|---|
| Metrics đầy đủ theo service (mục 8) | Có phàn nàn về tốc độ/ổn định mà log hiện tại không định vị được |
| Alarm có action chain tới người thật (mục 8) | Ngay khi có prod — Conditional ở dev |
| Dashboard tổng hợp (mục 8) | Cùng điều kiện với metrics đầy đủ |

**Reliability**

| Hạng mục | Bắt buộc khi nào |
|---|---|
| Capacity đo bằng load test thật (mục 9) | Trước khi bật auto scaling — luôn là bước tiên quyết, không tuỳ chọn |
| Auto scaling đúng traffic pattern thật (mục 10) | Traffic thật dao động rõ rệt, hoặc từng bị quá tải |
| RTO/RPO định nghĩa và test (mục 11) | Có SLA cam kết với khách hàng/đối tác |

**Cost**

| Hạng mục | Bắt buộc khi nào |
|---|---|
| Budget + tagging đầy đủ (mục 13) | Chi phí vượt mức dễ nhớ bằng mắt, hoặc nhiều team/service hơn |
| Review chi phí thực tế vs ước tính | Luôn nên làm hằng tháng, không chờ trigger |

## Cách mở rộng file này

- Khi 1 điều kiện kích hoạt xảy ra → **tạo task cụ thể trong checklist của [`00_PLAN.md`](00_PLAN.md)**, đồng thời cập nhật cột "Trạng thái" của dòng tương ứng trong Scale Trigger Matrix thành `Đã kích hoạt — YYYY-MM-DD, tracked ở 00_PLAN.md`. **Không xoá mục khỏi file này** — `01_SCALE_UP_PLAN.md` là tài liệu tham chiếu lâu dài ("vì sao architecture được nâng cấp"), còn `00_PLAN.md` là execution plan ("đang làm gì"). Xoá đi sẽ mất lý do quyết định khi nhìn lại sau này.
- Thêm rủi ro/yêu cầu mới phát sinh (ví dụ yêu cầu compliance cụ thể từ khách hàng) → thêm mục mới theo đúng format 3 phần (vấn đề → điều kiện → việc cần làm), đồng thời thêm 1 dòng vào Scale Trigger Matrix ở đầu file
