# call-center

FastAPI service deployed as an AWS Lambda that handles Twilio voice webhooks — inbound call recording and outbound call triggering.

## What it does

- **Inbound**: Twilio calls this when someone dials `+19068288788` → records the call + transcribes
- **Outbound**: REST endpoint to call a driver's phone, play a message, and capture their keypress (confirm/reject trip)

## Stack

- Python · FastAPI · Mangum (Lambda adapter) · Twilio
- Deployed as: AWS Lambda + API Gateway (SAM)

---

## Run locally

### 1. Install dependencies

```bash
cd src/call-center
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Create env file

```bash
cp envs/.env.example envs/.env.local   # if example exists, otherwise create it
```

`envs/.env.local`:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+19068288788
BASE_URL=https://xxxx.ngrok.io   # your ngrok URL (see step 4)
```

### 3. Start the server

```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Expose to internet (Twilio needs a public URL)

```bash
ngrok http 8000
```

Copy the `https://xxxx.ngrok.io` URL into `BASE_URL` in `.env.local`, then restart the server.

### 5. Configure Twilio

In [Twilio Console](https://console.twilio.com) → Phone Numbers → your number → Voice:

- **Webhook (inbound)**: `POST https://xxxx.ngrok.io/api/v1/calls/inbound/webhook`

### 6. Test

```bash
# Health check
curl http://localhost:8000/health

# Trigger an outbound call to a phone number
curl -X POST http://localhost:8000/api/v1/calls/outbound/dial \
  -H "Content-Type: application/json" \
  -d '{"to_number": "+84xxxxxxxxx"}'

# List recent calls
curl http://localhost:8000/api/v1/calls/recent

# Inbound: just call +19068288788 from any phone
```

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/calls/inbound/webhook` | Twilio inbound call webhook |
| POST | `/api/v1/calls/inbound/recorded` | Called when recording finishes |
| POST | `/api/v1/calls/inbound/recording-status` | Recording status callback |
| POST | `/api/v1/calls/inbound/transcription` | Transcription ready callback |
| POST | `/api/v1/calls/inbound/status` | Call status callback |
| POST | `/api/v1/calls/outbound/twiml` | TwiML for outbound calls |
| POST | `/api/v1/calls/outbound/gather` | Handles driver keypress (1=confirm, 2=reject) |
| POST | `/api/v1/calls/outbound/status` | Outbound status callback |
| POST | `/api/v1/calls/outbound/dial` | Trigger outbound call `{"to_number": "+84..."}` |
| GET | `/api/v1/calls/status/{call_sid}` | Get call status by SID |
| GET | `/api/v1/calls/recent` | List recent calls (Twilio API) |
| GET | `/api/v1/calls/twilio` | Full Twilio call log (`?limit=50&direction=outbound-api`) |
| GET | `/api/v1/calls/events` | Local webhook trail (`data/twilio_events.jsonl`) |
| GET | `/api/v1/calls/monitor/{call_sid}` | Live Twilio status + webhook events for one call |

---

## Deploy to AWS

```bash
bash infra/call-center/deploy.sh dev
```

Requires `envs/.env.dev` with all keys + `AWS_PROFILE=david`.

```bash
# Teardown
bash infra/call-center/teardown.sh dev
```

---

## Project structure

```
src/call-center/
├── app/
│   ├── main.py              # FastAPI app + Mangum Lambda handler
│   ├── api/v1/calls.py      # All Twilio webhook + REST endpoints
│   ├── services/
│   │   └── call_service.py  # Twilio REST API wrapper
│   └── core/
│       └── config.py        # Pydantic settings
├── envs/
│   └── .env.local           # Local secrets (not in git)
└── requirements.txt
```
