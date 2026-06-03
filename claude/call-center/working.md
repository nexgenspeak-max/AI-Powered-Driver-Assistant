# call-center — Working Log

Service: Twilio webhook handler (inbound + outbound calls)
Stack: FastAPI + Mangum → AWS Lambda + API Gateway (SAM)
Status: ✅ COMPLETE (local + AWS verified)

---

## What This Service Does

- Receives inbound calls from Twilio → plays Vietnamese greeting → records + transcribes
- Triggers outbound calls to drivers → plays trip notification → DTMF 1=confirm / 2=reject
- REST endpoints: `/outbound/dial`, `/status/{call_sid}`, `/recent`

---

## Key Files

| File | Purpose |
|------|---------|
| `src/call-center/app/main.py` | FastAPI app + Mangum Lambda handler |
| `src/call-center/app/api/v1/calls.py` | All Twilio webhook + REST endpoints |
| `src/call-center/app/services/call_service.py` | Twilio REST client wrapper |
| `src/call-center/app/core/config.py` | Settings — loads `envs/.env.{ENV}` |
| `infra/call-center/sam.yaml` | SAM: Lambda + API Gateway (explicit `CallCenterApi` resource) |
| `infra/call-center/deploy.sh` | `./deploy.sh dev` — sam build + deploy |
| `infra/call-center/teardown.sh` | `./teardown.sh dev` — delete stack |

---

## Env Files

| File | Purpose |
|------|---------|
| `src/call-center/envs/.env.local` | Local dev — ngrok BASE_URL |
| `src/call-center/envs/.env.dev` | AWS dev — BASE_URL auto-set by deploy script |
| `src/call-center/envs/.env.prod` | AWS prod (fill when ready) |

---

## Twilio Config

| Key | Value |
|-----|-------|
| Phone number | +19068288788 (US, Iron Mountain MI) |
| Trial verified number | +84867347452 |
| Inbound webhook (local) | `https://<ngrok>/api/v1/calls/inbound/webhook` |
| Inbound webhook (AWS) | `https://w3z46cdyff.execute-api.ap-southeast-1.amazonaws.com/dev/api/v1/calls/inbound/webhook` |
| Note | Webhook replaced by SIP Trunk for Step 2 |

---

## Commands

```bash
# Run locally
cd src/call-center
uvicorn app.main:app --reload --port 8000

# ngrok tunnel
ngrok http 8000

# Deploy to AWS
bash infra/call-center/deploy.sh dev

# Teardown
bash infra/call-center/teardown.sh dev

# Test outbound call
curl -X POST http://localhost:8000/api/v1/calls/outbound/dial \
  -H "Content-Type: application/json" \
  -d '{"to_number": "+84867347452"}'

# Watch Lambda logs
aws logs tail /aws/lambda/dev-driver-assistant-call-center --follow --profile david
```

---

## Steps Done

- [x] Created FastAPI app with all Twilio webhook endpoints
- [x] Fixed TwilioException at import (lazy init with `@lru_cache` + `Depends`)
- [x] Tested inbound call locally (ngrok) — Vietnamese greeting works
- [x] Tested outbound call — driver hears message, DTMF 1/2 works
- [x] Created SAM template (fixed circular dependency E3004 — explicit `CallCenterApi`)
- [x] Created `deploy.sh` + `teardown.sh` (reads from `envs/.env.dev`)
- [x] Deployed to AWS Lambda + API Gateway — health endpoint verified
- [x] Tested inbound call from AWS endpoint — works
- [x] Torn down stack

---

## Known Issues / Lessons Learned

- `CallService()` at module level → `TwilioException` at cold start. Fix: `@lru_cache` + `Depends()`
- SAM `${ServerlessRestApi}` in `Globals.Function.Environment` → circular dependency E3004. Fix: define `CallCenterApi` as explicit `AWS::Serverless::Api` resource
- SAM doesn't accept empty string parameter overrides. Fix: conditionally omit `BaseUrl` param when empty
- ngrok free tier: URL changes on restart, update Twilio Console each time
- Twilio Trial: inbound calls only work from verified numbers
