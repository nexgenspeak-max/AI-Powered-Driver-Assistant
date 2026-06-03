# call-logger — Working Log

Service: Call record storage — transcripts, summaries, metadata
Stack: FastAPI → Lambda → DynamoDB
Status: ✅ Built, not yet deployed

---

## What This Service Does

Receives a full call record from `voice-agent` at the end of every call and stores it in DynamoDB.
Used for monitoring, debugging, and improving the bot.

```
voice-agent (end of call)
  → POST /api/v1/records
  → call-logger Lambda
  → DynamoDB: dev-driver-assistant-call-records
```

---

## How It Connects to Other Services

### ← voice-agent sends data

At the end of every call, `voice-agent/app/call_recorder.py`:
1. Collects every conversation turn via `AgentSession.on("conversation_item_added")`
2. Generates a Vietnamese summary using GPT-4o-mini
3. POSTs the record to `CALL_LOGGER_URL/api/v1/records`

Configure in `src/voice-agent/envs/.env.local`:
```env
CALL_LOGGER_URL=http://localhost:8001   # local
# CALL_LOGGER_URL=https://xxx.execute-api.ap-southeast-1.amazonaws.com/dev  # deployed
```

### ← call-center (future)

When call-center receives a Twilio status callback (call completed), it can
also enrich the record with Twilio metadata (recording URL, duration from Twilio side).
Not yet implemented — planned for Step 4 (Call Summary).

---

## DynamoDB Table

**Table:** `{env}-driver-assistant-call-records`

| Attribute | Type | Description |
|---|---|---|
| `call_id` | String (PK) | LiveKit room name e.g. `driver-call-_+84867347452_abc` |
| `caller` | String (GSI) | Driver phone number e.g. `+84867347452` |
| `started_at` | String (GSI sort) | ISO 8601 timestamp |
| `ended_at` | String | ISO 8601 timestamp |
| `duration_seconds` | Number | Call length |
| `turns` | List | `[{role, text, ts}, ...]` — full transcript |
| `summary` | String | 3-sentence Vietnamese GPT summary |
| `stt_provider` | String | `openai` or `deepgram` |
| `llm_model` | String | `gpt-4o-mini` |
| `ttl` | Number | (optional) Unix timestamp for auto-expiry |

**GSI:** `caller-started_at-index` → query all calls for one driver, newest first.

**DeletionPolicy: Retain** — table survives CloudFormation teardown. Data is never auto-deleted by infra.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/records` | Save a call record (called by voice-agent) |
| `GET` | `/api/v1/records` | List recent calls (or `?caller=+84...` to filter by driver) |
| `GET` | `/api/v1/records/{call_id}` | Fetch one full record with transcript |

---

## Key Files

| File | Purpose |
|---|---|
| `src/call-logger/app/main.py` | FastAPI app + Mangum Lambda handler |
| `src/call-logger/app/api/v1/records.py` | Endpoints |
| `src/call-logger/app/services/record_service.py` | DynamoDB CRUD |
| `src/call-logger/app/core/config.py` | Settings (reads DYNAMODB_TABLE env var) |
| `src/call-logger/envs/.env.local` | Local config |
| `src/call-logger/envs/.env.dev` | Dev config |
| `infra/call-logger/sam.yaml` | Lambda + API GW + DynamoDB |
| `infra/call-logger/deploy.sh` | Build + deploy |
| `infra/call-logger/teardown.sh` | Delete Lambda/API (keeps DynamoDB) |
| `src/voice-agent/app/call_recorder.py` | Captures turns + generates summary + POSTs here |

---

## Commands

```bash
# Run locally
cd src/call-logger
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001

# Deploy
bash infra/call-logger/deploy.sh dev

# After deploy: copy the API URL output into voice-agent .env.dev
# CALL_LOGGER_URL=https://xxx.execute-api.ap-southeast-1.amazonaws.com/dev

# Watch logs
aws logs tail /aws/lambda/dev-driver-assistant-call-logger \
  --follow --profile david --region ap-southeast-1

# Teardown (DynamoDB table is kept)
bash infra/call-logger/teardown.sh dev
```

---

## Local Dev Flow (test without deploying)

1. Start call-logger locally:
   ```bash
   cd src/call-logger
   uvicorn app.main:app --reload --port 8001
   ```

2. Set in `src/voice-agent/envs/.env.local`:
   ```env
   CALL_LOGGER_URL=http://localhost:8001
   ```

3. Make a call → at end, voice-agent POSTs the record → check:
   ```bash
   curl http://localhost:8001/api/v1/records
   ```

   > Note: local DynamoDB access requires AWS credentials with the correct profile.
   > For pure local dev without AWS, you can use [DynamoDB Local](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html) or mock the service.

---

## Cost

- Lambda: ~$0.20 per million requests (essentially free at this scale)
- DynamoDB PAY_PER_REQUEST: ~$1.25 per million writes, ~$0.25 per million reads
- At 100 calls/day: < $0.01/month
