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
| `deploy-all.sh` | Full backend in correct order (external-api-service ×2) |
| `scale-ecs.sh` | Start/stop llm-orchestrator ECS (`0` or `1`) |
| `teardown-all.sh` | Delete all stacks (keeps DynamoDB data) |
| `{service}/deploy.sh` | Deploy one service |
| `{service}/teardown.sh` | Delete one stack |
| `frontend/deploy.sh` | Build + S3 sync web apps (optional) |

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
identity-service → external-api-service → call-records-service → external-channel-service → llm-orchestrator
```

URL wiring after each deploy: `AUTH_SERVICE_URL` → external-api-service, `TRIP_SERVICE_URL` / `CALL_LOGGER_URL` → llm-orchestrator (and call-records-service into trip).

---

## Environments

Templates support `dev`, `uat`, `prod` via:

```bash
bash infra/setup-env.sh uat
bash infra/deploy-all.sh uat
```

Stack names: `{env}-driver-assistant-{service}`

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
aws logs tail /ecs/dev-driver-assistant-voice-agent --follow

# Rollback ECS to previous task definition
aws ecs list-task-definitions --family-prefix dev-driver-assistant-voice-agent
```
