# call-records-service

Stores call records (transcript + GPT summary) from the llm-orchestrator after every call. Used for monitoring and bot improvement.

## Local dev

### 1. Create the DynamoDB table (one-time)

```bash
aws dynamodb create-table \
  --table-name local-driver-assistant-call-records \
  --attribute-definitions \
    AttributeName=call_id,AttributeType=S \
    AttributeName=caller,AttributeType=S \
    AttributeName=started_at,AttributeType=S \
  --key-schema AttributeName=call_id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[{"IndexName":"caller-started_at-index","KeySchema":[{"AttributeName":"caller","KeyType":"HASH"},{"AttributeName":"started_at","KeyType":"RANGE"}],"Projection":{"ProjectionType":"ALL"}}]' \
  --profile david --region ap-southeast-1
```

> Skip this step if the table already exists.

### 2. Start call-records-service

```bash
cd src/call-records-service
pip install -r requirements.txt
AWS_PROFILE=david uvicorn app.main:app --reload --port 8001
```

### 3. Point llm-orchestrator at it

In `src/llm-orchestrator/envs/.env.local`:
```env
CALL_LOGGER_URL=http://localhost:8001
```

### 4. Start llm-orchestrator

```bash
cd src/llm-orchestrator
python -m app.main dev
```

### 5. Make a call then check records

```bash
# All recent records
curl http://localhost:8001/api/v1/records

# Filter by caller
curl "http://localhost:8001/api/v1/records?caller=+84867347452"

# One full record with transcript
curl http://localhost:8001/api/v1/records/<call_id>
```

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/records` | Save a call record (llm-orchestrator calls this) |
| `GET` | `/api/v1/records` | List recent calls (`?caller=+84...` to filter) |
| `GET` | `/api/v1/records/{call_id}` | Full record with transcript + summary |

---

## Deploy to AWS

```bash
bash infra/call-records-service/deploy.sh dev
# Output: CALL_LOGGER_URL=https://xxx... → paste into llm-orchestrator .env.dev

bash infra/call-records-service/teardown.sh dev   # Lambda/API GW removed, DynamoDB table kept
```

After deploy, update `src/llm-orchestrator/envs/.env.dev`:
```env
CALL_LOGGER_URL=https://xxx.execute-api.ap-southeast-1.amazonaws.com/dev
```
