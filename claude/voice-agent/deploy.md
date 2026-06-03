# Voice Agent — Deployment Guide

Deploy the voice agent worker to AWS ECS Fargate so it runs 24/7 in the cloud.

---

## 1. What Gets Deployed

```
AWS (ap-southeast-1)
├── ECR Repository          — stores Docker image
├── ECS Cluster             — Fargate compute
│   └── ECS Service (1 task)
│       └── voice-agent container
│           ├── connects outbound to LiveKit Cloud (wss://)
│           ├── connects outbound to OpenAI / Deepgram / ElevenLabs
│           └── NO inbound traffic — no load balancer needed
├── CloudWatch Log Group    — /ecs/dev-driver-assistant-voice-agent
└── IAM Roles               — execution + task roles
```

The agent is a **pure outbound worker** — it connects TO LiveKit, not the other way around. This means:
- No load balancer needed → saves ~$20/month
- No public IP rules needed for inbound
- Security group allows only egress

---

## 2. Cost Estimate

### ECS Fargate (ap-southeast-1)

| Resource | Rate | 24/7 monthly |
|---|---|---|
| 1 vCPU | $0.04048/hr | ~$30 |
| 2 GB memory | $0.004445/hr | ~$3.20 |
| **Fargate total** | | **~$33/month** |

### Other AWS

| Resource | Cost |
|---|---|
| ECR storage (~500 MB image) | ~$0.05/month |
| CloudWatch Logs (minimal) | ~$0.10/month |
| Data transfer (outbound to LiveKit) | ~$0.50/month |
| **AWS total** | **~$34/month** |

### API Services (per-minute call costs)

| Service | Rate | Notes |
|---|---|---|
| Deepgram Nova-2 STT | $0.0043/min audio | Pay-as-you-go |
| OpenAI GPT-4o-mini | $0.15/M input + $0.60/M output tokens | Very cheap per call |
| ElevenLabs Flash v2.5 | Included in plan | $5/month starter (10k chars) |

**Example: 1-minute call cost ≈ $0.005–$0.01** (mostly Deepgram + ElevenLabs chars)

### Cost Control Tips

- **Dev/test:** Set `DESIRED_COUNT=0` when not testing → $0 Fargate cost
- **Scale to 0 before stopping for the day:**
  ```bash
  aws ecs update-service --cluster dev-driver-assistant-voice-agent \
    --service dev-driver-assistant-voice-agent \
    --desired-count 0 --profile david --region ap-southeast-1
  ```
- **Scale back up when testing:**
  ```bash
  aws ecs update-service --cluster dev-driver-assistant-voice-agent \
    --service dev-driver-assistant-voice-agent \
    --desired-count 1 --profile david --region ap-southeast-1
  ```
- At 8 hours/day testing × 22 days/month = **~$8/month** instead of $33

---

## 3. Prerequisites

- [ ] Docker Desktop running locally
- [ ] AWS CLI installed (`aws --version`)
- [ ] AWS profile `david` configured (`aws sts get-caller-identity --profile david`)
- [ ] All API keys in `src/voice-agent/envs/.env.dev`

---

## 4. Fill in `.env.dev`

File: `src/voice-agent/envs/.env.dev`

The only fields you need to fill in (copy from `.env.local`):

```bash
LIVEKIT_API_KEY=<from .env.local>
LIVEKIT_API_SECRET=<from .env.local>
OPENAI_API_KEY=<from .env.local>
DEEPGRAM_API_KEY=<from .env.local>
ELEVENLABS_API_KEY=<from .env.local>
```

Then get the VPC and subnet IDs:

```bash
# Get default VPC ID
aws ec2 describe-vpcs --profile david \
  --query 'Vpcs[?IsDefault==`true`].VpcId' --output text

# Get public subnets in that VPC (replace vpc-xxx with your VPC ID)
aws ec2 describe-subnets --profile david \
  --filters Name=vpc-id,Values=vpc-xxx Name=mapPublicIpOnLaunch,Values=true \
  --query 'Subnets[*].SubnetId' --output text
```

Fill in `VPC_ID` and `SUBNET_IDS` (comma-separated):

```bash
VPC_ID=vpc-0abc1234def56789
SUBNET_IDS=subnet-0111,subnet-0222,subnet-0333
```

---

## 5. Deploy

```bash
cd /path/to/doantotnghiep
bash infra/voice-agent/deploy.sh dev
```

This does 3 things in order:
1. **CloudFormation deploy** — creates ECR repo, ECS cluster, task definition, service
2. **Docker build + push** — builds image (downloads models into it), pushes to ECR
3. **ECS force-redeploy** — tells ECS to pull the new image and restart

First deploy takes **~5-8 minutes** (building image with model downloads is slow).
Subsequent deploys: ~3-4 minutes.

### What to watch for

```
====================================
 voice-agent — Deploy
 Environment : dev
 Stack       : dev-driver-assistant-voice-agent
====================================
→ Deploying CloudFormation stack...    ← creates infra
→ Logging into ECR...
→ Building Docker image...             ← slow first time (~3 min)
→ Pushing image to ECR...
→ Redeploying ECS service...
✅ voice-agent deployed!
```

---

## 6. Verify It's Running

```bash
# Watch live logs
aws logs tail /ecs/dev-driver-assistant-voice-agent \
  --follow --profile david --region ap-southeast-1

# Expected output after ~30s:
# INFO  livekit.agents  registered worker  {"agent_name": "", "id": "AW_..."}
```

If you see `registered worker` — the agent is live and will answer calls.

---

## 7. Monitor

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster dev-driver-assistant-voice-agent \
  --services dev-driver-assistant-voice-agent \
  --profile david --region ap-southeast-1 \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}'

# Tail logs
aws logs tail /ecs/dev-driver-assistant-voice-agent --follow \
  --profile david --region ap-southeast-1

# See recent call activity (look for "received job request")
aws logs filter-log-events \
  --log-group-name /ecs/dev-driver-assistant-voice-agent \
  --filter-pattern "job request" \
  --profile david --region ap-southeast-1
```

---

## 8. Update / Redeploy

After changing agent code:

```bash
bash infra/voice-agent/deploy.sh dev
```

The new container will start, and ECS will drain the old one gracefully.

---

## 9. Teardown

```bash
bash infra/voice-agent/teardown.sh dev
```

This scales to 0, deletes ECR images, then deletes the CloudFormation stack.
Costs stop immediately.

---

## 10. Troubleshooting

### Task keeps stopping / restarting

Check the logs for the crash reason:
```bash
aws logs tail /ecs/dev-driver-assistant-voice-agent --profile david --region ap-southeast-1
```

Common causes:
- Missing env var → check `.env.dev` has all keys filled
- Wrong API key → check each service key
- LiveKit URL wrong → check `LIVEKIT_URL` in `.env.dev`

### Task stays in PENDING / never reaches RUNNING

```bash
# Check ECS events
aws ecs describe-services \
  --cluster dev-driver-assistant-voice-agent \
  --services dev-driver-assistant-voice-agent \
  --profile david --region ap-southeast-1 \
  --query 'services[0].events[:5]'
```

Usually means: image pull failed (ECR permissions) or no subnets with public IP.

### `registered worker` never appears in logs

The container started but can't reach LiveKit.
- Check `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`
- Check security group allows outbound HTTPS (port 443) — it does by default

### Calls get "No Answer" after deploying

The agent isn't registered. Check the logs — it should show `registered worker` within 30s of the task starting.

---

## 11. Infra Files Summary

| File | Purpose |
|---|---|
| `src/voice-agent/Dockerfile` | Container: Python 3.11-slim, downloads all models at build time |
| `src/voice-agent/envs/.env.dev` | Dev environment variables — fill API keys + VPC_ID + SUBNET_IDS |
| `infra/voice-agent/cfn.yaml` | CloudFormation: ECR + ECS Cluster + Task + Service + IAM + Logs |
| `infra/voice-agent/deploy.sh` | One command to build + push + deploy |
| `infra/voice-agent/teardown.sh` | One command to scale down + delete everything |
