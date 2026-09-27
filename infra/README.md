# AWS Deploy — Driver Assistant

Scripts to deploy the backend to AWS (`ap-southeast-1`).  
Detailed plan: [`claude/docs/deploy/00_PLAN.md`](../claude/docs/deploy/00_PLAN.md)

## Do you need to deploy now?

| Situation | Deploy AWS? |
|-----------|-------------|
| Still debugging voice/SIP locally | **No** — use `run/start-all.sh` + local services |
| Need demo accessible without your laptop | **Yes** — deploy dev, scale ECS to 0 when done |
| Thesis demo in 1–2 weeks | **Yes** — deploy dev now, test early |
| Only building features, no external demo | **No** — prepare scripts only (this folder) |

**Idle cost if full dev stack runs 24/7:** ~$61–66/month (0 calls).  
**Recommended while developing:** deploy Lambda services only, skip llm-orchestrator, or set `DESIRED_COUNT=0`.

---

## Quick start (dev)

```bash
# 1. Prerequisites
brew install awscli aws-sam-cli docker
aws configure --profile czen-dev
export AWS_PROFILE=czen-dev
export AWS_REGION=ap-southeast-1

# 2. Create env files from templates (+ copy keys from .env.local)
bash infra/setup-env.sh dev --from-local

# 3. Check what's already on AWS
bash infra/status.sh dev

# 4. Deploy everything (or partial — see below)
bash infra/deploy-all.sh dev

# 5. Save cost when not testing voice
bash infra/scale-ecs.sh dev 0
```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `setup-env.sh` | Create `src/backend/*/envs/.env.dev` from templates |
| `status.sh` | Stack status + idle cost hint |
| `deploy-all.sh` | Full backend in dependency order, copies service URLs between env files |
| `scale-ecs.sh` | Start/stop llm-orchestrator ECS (`0` or `1`) |
| `teardown-all.sh` | Delete all stacks (keeps DynamoDB data) |
| `{service}/deploy.sh` | Deploy one service |
| `{service}/teardown.sh` | Delete one stack |
| `frontend/deploy.sh` | Build + S3 sync web apps (admin-panel, super-admin-panel, customer-web, driver-web) |
| `lib/sam.sh` | Shared SAM build/deploy/teardown used by every `{service}/deploy.sh` |
| `local/ensure-local-tables.sh` | Add the daily-report index to the local call-records table (and optional local tables) |

### Partial deploy

```bash
# Lambda only (~$0-5/month idle) — no voice worker in cloud
bash infra/deploy-all.sh dev --skip llm-orchestrator

# Dry-run (print commands only)
bash infra/deploy-all.sh dev --dry-run

# Single service
bash infra/identity-service/deploy.sh dev
```

---

## Deploy order (automatic in deploy-all.sh)

```
identity-service → call-records-service → external-channel-service → external-api-service → llm-orchestrator → ops-service
```

Each service is deployed after the services it calls. URL wiring after each deploy:

| Output | Env var | Written to |
|---|---|---|
| `IdentityApiUrl` | `IDENTITY_SERVICE_URL` | external-api-service |
| `CallRecordsApiUrl` | `CALL_RECORDS_SERVICE_URL` | external-api-service, llm-orchestrator |
| `ExternalChannelApiUrl` | `EXTERNAL_CHANNEL_SERVICE_URL` | external-api-service |
| `ExternalApiUrl` | `EXTERNAL_API_SERVICE_URL` | llm-orchestrator |

ops-service reads all four URLs from the stack outputs itself. Older names `AUTH_SERVICE_URL`, `TRIP_SERVICE_URL`, `CALL_LOGGER_URL` are still accepted by the services.

---

## Environments

Templates support `dev`, `uat`, `prod` via:

```bash
bash infra/setup-env.sh uat
bash infra/deploy-all.sh uat
```

## Naming convention

| Item | Pattern | Example |
|---|---|---|
| Stack | `{env}-driver-assistant-{service}` | `dev-driver-assistant-identity-service` |
| Logical ID | `<Service><Role>` | `IdentityFunction`, `CallRecordsTable`, `LlmOrchestratorService` |
| Lambda / API | `{env}-driver-assistant-{service}-fn` / `-api` | `dev-driver-assistant-ops-service-fn` |
| DynamoDB table | `{env}-driver-assistant-{service}-{table}` | `dev-driver-assistant-call-records-service-call-records` |
| Log group | `/aws/lambda/<function>` or `/ecs/{env}-driver-assistant-llm-orchestrator` | |
| Tags | `app`, `env`, `service`, `layer`, `component` | `layer` = layer name on thesis Figure 4.1 |

API Gateway proxies every path (`ANY /{proxy+}`) to the service's Express app, so new routes need no template change.

| Stack | Owns (DynamoDB) |
|---|---|
| identity-service | accounts, driver-settings |
| external-api-service | trips, ws-connections (API Gateway WebSocket connection ids for push) |
| external-channel-service | channel-events (Twilio webhooks, SMS sends) |
| call-records-service | call-records (transcript, summary, session metrics) |
| ops-service | daily-reports (+ EventBridge Scheduler 00:15 Asia/Ho_Chi_Minh) |

---

## CI/CD (future)

When ready, add GitHub Actions with OIDC + branch mapping:

- `develop` → auto deploy `dev`
- `uat` → deploy `uat`
- `main` → deploy `prod` (manual approval)

See `00_PLAN.md` section 8.

---

## Troubleshooting

```bash
# List stacks
aws cloudformation list-stacks --region ap-southeast-1 \
  --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE \
  --query "StackSummaries[?contains(StackName,'driver-assistant')].StackName"

# Voice-agent logs
aws logs tail /ecs/dev-driver-assistant-llm-orchestrator --follow

# Rollback ECS to previous task definition
aws ecs list-task-definitions --family-prefix dev-driver-assistant-llm-orchestrator
```
