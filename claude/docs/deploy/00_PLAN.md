# 00 — Kế hoạch deploy lên AWS (quy mô hiện tại)

> File này trả lời câu hỏi: **"Ở quy mô hiện tại (dev, 1 người vận hành, chưa có user thật), deploy cả hệ thống Czen lên AWS thì cần gì, làm theo thứ tự nào?"**
> Đây là kế hoạch cho **quy mô hiện tại** — mọi mục đều được chọn vì rẻ/đơn giản để làm đúng ngay từ đầu, không phải vì "sau này sẽ cần" (những cái đó nằm ở [`01_SCALE_UP_PLAN.md`](01_SCALE_UP_PLAN.md), chỉ làm khi có điều kiện kích hoạt thật).
> Living document — cập nhật khi trạng thái deploy thay đổi. Nhật ký công việc hằng ngày ở nơi khác trong `claude/docs/`, không lặp lại ở đây.
>
> Tổng quan kiến trúc & vai trò từng service: xem [`../web/00_OVERVIEW.md`](../web/00_OVERVIEW.md).

## 1. Mục tiêu

Đưa toàn bộ hệ thống Czen (5 service backend + frontend) chạy được trên AWS ở mức: có `dev` để test, có CI/CD thay vì deploy tay, có rollback thật sự khi lỗi, có giám sát cơ bản, có ước tính chi phí — **vừa đủ cho 1 người vận hành**, không over-engineer cho quy mô chưa tồn tại.

Không thuộc phạm vi: publish mobile app (Expo EAS riêng, không phải AWS).

## 2. Sơ đồ phụ thuộc giữa các service

**Đây không phải 1 DAG thuần** — có 1 cạnh đi ngược lại (`trip-service` cần thứ mà `voice-agent` tạo ra, nhưng `voice-agent` lại cần `trip-service` deploy trước đó để lấy `TRIP_SERVICE_URL`). Gọi đúng tên: **bootstrap dependency / two-phase deployment** — không thể deploy 2 service này cùng lúc với đầy đủ thông tin của nhau, nên tách thành 2 phase, chấp nhận `trip-service` deploy 2 lần. Đây là giải pháp hợp lý ở quy mô hiện tại (mục 5), không phải lỗi thiết kế — nhưng khi tự động hoá CI/CD (mục 8) cần biết rõ đây là vòng lặp có chủ đích, không phải bug trong dependency graph.

```
Phase 1 — DAG tuyến tính (không có cạnh ngược):

  auth-service ──AUTH_SERVICE_URL──▶ trip-service ──TRIP_SERVICE_URL──▶ voice-agent

Phase 2 — bootstrap: đóng vòng bằng redeploy, không phải dependency thật giữa 2 stack:

  voice-agent ──VOICE_AGENT_URL──▶ trip-service (redeploy lần 2, chỉ đổi 1 biến env)

  call-logger, call-center: độc lập, không thuộc 2 phase trên
```

**3 loại phụ thuộc khác nhau ở đây — cố tình phân biệt để không nhầm khi tự động hoá sau này:**

| Loại | Ví dụ | Ý nghĩa |
|---|---|---|
| **Deployment dependency** | `trip-service` phải *tồn tại* trước khi deploy được `voice-agent` | Thứ tự bắt buộc, không đảo được |
| **Configuration dependency** | `voice-agent` cần biết `TRIP_SERVICE_URL` | Chỉ là 1 giá trị cấu hình cần truyền đúng, không nhất thiết phải "deploy lại" nếu có cơ chế đọc động |
| **Runtime dependency** | `voice-agent` *gọi* `trip-service` lúc chạy | Không liên quan gì đến thứ tự deploy, chỉ cần cả 2 đang chạy |

`trip-service` phải deploy 2 lần hiện tại (trước và sau `voice-agent`) là do đang giải quyết **configuration dependency bằng cách deploy lại** — chấp nhận được ở quy mô 1 người, tay chân (mục 5), nhưng đây chính là chỗ sẽ đổi sang SSM Parameter Store khi làm CI/CD (mục 7) để không phải deploy 2 lần nữa.

## 3. Trạng thái hiện tại (cập nhật 2026-08-27)

| Service | Stack | Trạng thái | Owner | Blocker | Next action |
|---|---|---|---|---|---|
| `auth-service` | `dev-driver-assistant-auth-service` | ✅ Deployed | — | — | — |
| `trip-service` | `dev-driver-assistant-trip-service` | ✅ Deployed | — | — | — |
| `call-logger` | `dev-driver-assistant-call-logger` | ❌ Chưa deploy | Backend | Không có | Deploy ngay, không vướng gì |
| `call-center` | `dev-driver-assistant-call-center` | ❌ Chưa deploy | Backend | Thiếu Twilio creds trong `.env.dev` | Điền `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_PHONE_NUMBER` rồi deploy |
| `voice-agent` | `dev-driver-assistant-voice-agent` | ❌ Chưa deploy | Backend | IAM user `long` chưa có quyền EC2/ECS/ECR/ALB | Xin cấp quyền (mục 4) rồi lấy VPC/Subnet ID |
| Frontend (`admin-panel`/`customer-web`/`driver-web`) | — | ❌ Chưa có hạ tầng | FE | Chưa có S3/CloudFront | Xem mục 8 |
| CI/CD | — | ❌ Chưa có | Backend | Chưa viết workflow | Xem mục 7, làm sau khi chuẩn hoá xong 1 pattern Lambda + 1 pattern ECS |

Kiểm tra lại trạng thái thật bất cứ lúc nào:
```bash
aws cloudformation list-stacks --region ap-southeast-1 --profile <profile> \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[].{Name:StackName,Status:StackStatus}" --output table
```

## 4. IAM cho user deploy — least-privilege, không dùng policy "Full/IAMFullAccess"

Quyền tối thiểu cần cấp thêm cho user hiện tại để deploy được `voice-agent` (thay vì gắn `AmazonECS_FullAccess`/`IAMFullAccess` cho nhanh — quyền đó quá rộng so với việc cần làm):

- **EC2 (chỉ đọc, không cần tạo VPC mới)**: `ec2:DescribeVpcs`, `ec2:DescribeSubnets`, `ec2:DescribeSecurityGroups`, `ec2:CreateSecurityGroup`, `ec2:DeleteSecurityGroup`, `ec2:AuthorizeSecurityGroupIngress`, `ec2:RevokeSecurityGroupIngress` (CFN cần tạo/sửa/xoá đúng 2 security group trong `cfn.yaml`, không hơn)
- **ECS**: giới hạn theo resource `dev-driver-assistant-voice-agent*` thay vì `ecs:*` trên toàn account — action cần: `ecs:CreateCluster`, `ecs:DescribeClusters`, `ecs:RegisterTaskDefinition`, `ecs:CreateService`, `ecs:UpdateService`, `ecs:DescribeServices`
- **ECR**: `ecr:CreateRepository`, `ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:InitiateLayerUpload`, `ecr:UploadLayerPart`, `ecr:CompleteLayerUpload`
- **ELB**: `elasticloadbalancing:*` giới hạn theo tag/resource của stack này
- **IAM (chỉ để CFN tạo 2 role cố định)**: `iam:CreateRole`, `iam:PutRolePolicy`, `iam:PassRole`, `iam:GetRole`, `iam:DeleteRole` — **giới hạn `Resource` chỉ tới `role/dev-driver-assistant-voice-agent-*`**, không cấp `iam:*` trên toàn account

Viết thành 1 policy JSON riêng (`infra/voice-agent/iam-deploy-policy.json`) thay vì gắn managed policy rộng — attach cho user `long`. Đây là việc nên làm **trước khi** xin cấp quyền, để người cấp quyền (chủ account) chỉ cần approve 1 policy cụ thể thay vì "full access".

## 5. Trình tự deploy (dev) — vẫn làm tay ở quy mô này, chấp nhận được

| # | Service | Lệnh | Trước khi chạy | Sau khi chạy |
|---|---|---|---|---|
| 1 | `auth-service` | `infra/auth-service/deploy.sh dev` | `JWT_SECRET` thật | Copy `ApiUrl` → `trip-service` |
| 2 | `trip-service` | `infra/trip-service/deploy.sh dev` | `AUTH_SERVICE_URL`, `JWT_SECRET` khớp | Copy `ApiUrl` → `voice-agent` |
| 3 | `call-logger` | `infra/call-logger/deploy.sh dev` | không cần gì thêm | Copy `ApiUrl` → `voice-agent` (optional) |
| 4 | `call-center` | `infra/call-center/deploy.sh dev` | Twilio creds | — |
| 5 | `voice-agent` | `infra/voice-agent/deploy.sh dev` | Mục 4 (IAM) xong, VPC/Subnet ID, Docker chạy | Copy `VoiceAgentApiUrl` → `trip-service`, deploy lại bước 2 |

Đã xong: bước 1, 2. Tiếp theo: bước 3, 4 (không vướng gì) → bước 5 sau khi có quyền IAM.

## 6. Secrets — quy mô hiện tại

`.env.dev` local, không commit git (`.gitignore` đã chặn) — **đủ dùng** khi chỉ 1 người deploy tay. Không cần Secrets Manager ngay bây giờ.

Quy tắc bắt buộc giữ: `JWT_SECRET` phải **giống hệt** giữa `auth-service`/`trip-service`/`voice-agent` — khi đổi, đổi cả 3 nơi cùng lúc, không đổi lẻ.

→ Chuyển sang Secrets Manager là việc bắt buộc trước khi có CI/CD hoặc thêm người thứ 2 deploy — xem [`01_SCALE_UP_PLAN.md`](01_SCALE_UP_PLAN.md#secrets).

## 7. Rollback — procedure cụ thể (không chỉ nêu mục tiêu)

**Lambda (`auth-service`, `trip-service`, `call-logger`, `call-center`):**
SAM/Lambda tự giữ version cũ. Nếu deploy mới bị lỗi runtime (không phải lỗi khi `sam deploy` — cái đó tự rollback CFN sẵn):
```bash
# Xem các version gần nhất
aws lambda list-versions-by-function --function-name <FunctionName> --region ap-southeast-1 --profile <profile>
# Trỏ alias/production về lại version cũ (nếu dùng alias) hoặc:
# redeploy từ git commit trước đó bằng đúng deploy.sh — an toàn nhất vì đồng bộ cả code lẫn CFN template
git checkout <commit-truoc> -- src/backend/<service> infra/<service>
./infra/<service>/deploy.sh dev
```
Cách an toàn nhất ở quy mô hiện tại: **rollback = redeploy từ commit cũ**, vì `deploy.sh` luôn build lại từ source, không có state ẩn nào khác cần xử lý.

**ECS (`voice-agent`):**
```bash
# Xem các task definition revision trước đó
aws ecs list-task-definitions --family-prefix dev-driver-assistant-voice-agent --region ap-southeast-1 --profile <profile>
# Trỏ service về lại revision cũ
aws ecs update-service --cluster <cluster> --service <service> \
  --task-definition dev-driver-assistant-voice-agent:<revision-cu> --region ap-southeast-1 --profile <profile>
```
Image cũ vẫn còn trong ECR (không bị xoá khi push mới) nên revision cũ chạy lại được ngay, không cần build lại Docker image.

**Điều kiện coi là "cần rollback":** health check endpoint (`/health` — voice-agent đã có sẵn) trả lỗi, hoặc lỗi 5xx tăng bất thường trong 5 phút sau deploy. Ở quy mô hiện tại, việc kiểm tra này làm **tay** (mở URL/log CloudWatch xem ngay sau deploy) — tự động hoá (health check step trong CI) là việc của `01_SCALE_UP_PLAN.md`.

## 8. CI/CD — bắt đầu từ 1 pattern, không làm cả 5 service cùng lúc

Đồng ý với nguyên tắc: **chuẩn hoá xong 1 service Lambda (`auth-service`) + 1 service ECS (`voice-agent`) trước**, chạy ổn (build → deploy → health check → rollback nếu fail) rồi mới nhân bản pattern sang `trip-service`/`call-logger`/`call-center`. Lý do: tránh sửa lại 5 workflow gần giống nhau khi phát hiện thiếu sót ở workflow đầu tiên.

**Nguyên tắc:**
- OIDC (không dùng access key tĩnh) — IAM Role dùng đúng policy least-privilege ở mục 4
- GitHub Environments tách `dev`/`prod`, `prod` bật required reviewer
- `push master` → deploy `dev` tự động; `prod` chỉ qua `workflow_dispatch` + approve
- **GitHub Actions không được cầm secret value** (`OPENAI_API_KEY`, `JWT_SECRET`, Twilio creds...) dù là qua GitHub Environment secrets — luồng đúng là workflow chỉ deploy code/infra, còn Lambda/ECS tự đọc Secrets Manager tại runtime bằng IAM role (đã mô tả ở [`01_SCALE_UP_PLAN.md#secrets`](01_SCALE_UP_PLAN.md#secrets)):

  ```text
  GitHub Actions (OIDC, không cầm secret)
        ↓ deploy code + CloudFormation template
  Lambda/ECS (có IAM role đọc Secrets Manager)
        ↓ runtime tự gọi GetSecretValue
  Twilio / OpenAI / ElevenLabs / JWT verify...
  ```

  Khác với việc chỉ copy `.env.dev` → GitHub Environment secret → truyền làm `--parameter-overrides` plaintext cho CloudFormation (cách này vẫn để lộ secret value trong workflow run/log tiềm ẩn) — nếu mục tiêu cuối là Secrets Manager thì nên làm đúng từ đầu khi viết workflow, không viết theo kiểu cũ rồi sửa lại sau

**Thứ tự làm:**
1. Viết workflow cho `auth-service` (Lambda pattern) — kèm bước health check gọi `ApiUrl` sau deploy
2. Viết workflow cho `voice-agent` (ECS pattern) — kèm build/push Docker + health check `/health` + rollback tự động nếu health check fail (dùng lệnh ở mục 7)
3. Sau khi cả 2 chạy ổn ít nhất vài lần thật — nhân bản sang `trip-service`, `call-logger`, `call-center`
4. Lúc này mới đổi cách truyền `*_URL` giữa service từ "copy tay" sang SSM Parameter Store (đọc output của stack trước qua `{{resolve:ssm:...}}` trong template) — giải quyết luôn việc `trip-service` phải deploy 2 lần (mục 2)

## 9. Frontend — deploy plan quy mô hiện tại

| App | Hạ tầng | Ghi chú |
|---|---|---|
| `admin-panel`, `customer-web`, `driver-web` | S3 (private, không bật static website hosting) + CloudFront với **Origin Access Control** | Không dùng S3 static-website-endpoint công khai — CloudFront + OAC không tốn thêm chi phí đáng kể so với S3 public, nhưng đúng ngay từ đầu, không phải "nâng cấp sau" |
| SPA routing | CloudFront custom error response: 403/404 → `/index.html` (200) | Cần cho React Router hoạt động đúng khi refresh trang con |
| Cache invalidation sau mỗi deploy | `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"` | Thêm vào cuối script deploy frontend |
| `agents-playground` | Xác nhận với chủ dự án có cần deploy không — có vẻ chỉ dùng nội bộ/dev | — |

Build biến môi trường riêng theo `dev`/`prod` (Vite `.env.production`), không dùng chung 1 build.

## 10. Giám sát — mức tối thiểu đủ dùng

- CloudWatch Alarm: Lambda `Errors` > 0 trong 5 phút (cho cả 4 service Lambda), ECS task health/`RunningCount` < `DesiredCount`
- 1 **billing alarm** duy nhất (tổng chi phí account vượt ngưỡng $X/tháng) — quan trọng nhất ở quy mô hiện tại vì tránh chi phí phát sinh bất ngờ từ ECS/ALB chạy 24/7
- Cả 2 loại alarm trên bắn qua SNS → email (chưa cần Slack/Pager ở quy mô 1 người)
- Dashboard tổng hợp, p95 latency, metrics chi tiết theo service → để ở `01_SCALE_UP_PLAN.md`

## 11. Cost ước tính thô (dev, dùng ở mức thấp)

| Service | Ước tính/tháng | Ghi chú |
|---|---|---|
| Lambda × 4 (auth/trip/call-logger/call-center) | ~$0-5 | Free tier 1M request/tháng, traffic dev thấp gần như miễn phí |
| DynamoDB (on-demand) | ~$0-5 | Free tier 25GB + on-demand pricing thấp ở traffic dev |
| API Gateway | ~$0-5 | Free tier 1M request/tháng (12 tháng đầu) |
| ECS Fargate (voice-agent, 1 task, luôn chạy) | ~$15-25 | Không có free tier — chi phí cố định vì chạy 24/7, kể cả không có cuộc gọi nào |
| ALB (cho voice-agent) | ~$18-20 | Phí cố định theo giờ, không phụ thuộc traffic |
| S3 + CloudFront (frontend, traffic thấp) | ~$1-5 | |
| CloudWatch Logs/Alarms | ~$1-3 | |
| **Tổng ước tính** | **~$35-65/tháng** | Chưa gồm chi phí API bên thứ 3 (OpenAI, ElevenLabs, LiveKit, Twilio, Deepgram) — tính riêng theo usage thực tế, không phải chi phí AWS |

Không cần chính xác — mục đích là biết trước "chạy `voice-agent` 24/7 sẽ tốn cố định ~$35-45/tháng dù không ai gọi", để cân nhắc có nên dừng ECS service khi không dùng (`DesiredCount=0`) trong giai đoạn còn test.

## 12. Checklist quy mô hiện tại

- [x] `auth-service` deployed (dev)
- [x] `trip-service` deployed (dev)
- [ ] `call-logger` deployed (dev)
- [ ] `call-center` deployed (dev)
- [ ] IAM policy least-privilege cho `voice-agent` (mục 4) được viết + cấp
- [ ] `voice-agent` deployed (dev)
- [ ] `trip-service` redeploy lần 2 với `VOICE_AGENT_URL`
- [ ] Rollback procedure (mục 7) đã thử 1 lần thật (không chỉ đọc lý thuyết)
- [ ] CI/CD workflow cho `auth-service` (pattern Lambda)
- [ ] CI/CD workflow cho `voice-agent` (pattern ECS)
- [ ] Nhân bản CI/CD sang 3 service còn lại
- [ ] Frontend: S3 + CloudFront + OAC cho 3 app web
- [ ] Billing alarm được bật
- [ ] Cost thực tế tháng đầu được đối chiếu với ước tính ở mục 11

## Cách mở rộng file này

- Xong 1 mục checklist → tick lại, cập nhật bảng trạng thái mục 3
- Khi điều kiện kích hoạt ở [`01_SCALE_UP_PLAN.md`](01_SCALE_UP_PLAN.md) xảy ra (có traffic thật, thêm người deploy, cần SLA...) → chuyển mục tương ứng từ đó vào checklist ở đây
- Quyết định kiến trúc lớn → ghi vào [`../web/05_DECISIONS.md`](../web/05_DECISIONS.md), chỉ link ở đây
