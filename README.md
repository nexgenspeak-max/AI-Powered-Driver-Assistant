# AI-Powered Driver Assistant

Hands-free voice assistant for a ride-hailing driver. The driver speaks in the app; the assistant checks trips, earnings, and can call or message the rider. Each folder below owns one job. A service does not open another service's database.

## Who resolves what

| Folder | Resolves |
|---|---|
| `src/frontend/driver-app` | Driver phone app (the product surface). |
| `src/frontend/customer-app` | Rider phone app. |
| `src/frontend/driver-web`, `customer-web` | Web previews of those apps. |
| `src/frontend/admin-panel` | Dispatcher: seed trips, watch dispatch. |
| `src/frontend/super-admin-panel` | Operations screens. Talks only to `ops-service`. |
| `src/frontend/agents-playground` | LiveKit debug UI, not a product app. |
| `src/backend/identity-service` | Accounts, login, JWT. The only writer of account data. Port 8003. |
| `src/backend/external-api-service` | Trips, driver context, maps, and LiveKit dial for a trip. Port 8002. |
| `src/backend/external-channel-service` | Twilio calls and SMS out to the phone network. Port 8000. |
| `src/backend/call-records-service` | Call transcripts and summaries. Port 8001. |
| `src/backend/llm-orchestrator` | The voice worker: speech to text, the language model with tools, text to speech. No database. |
| `src/backend/ops-service` | Backend for the super-admin panel: health, log tail, call-record proxy. Port 8004. |
| `src/e2e` | Scripts that cross services. Not a product. |
| `infra/` | Deploy scripts for the services above. |

How to run each service is in that folder's README.

## One spoken question

The driver speaks in `driver-app`. LiveKit carries the audio to `llm-orchestrator`. That worker asks `external-api-service` for trip data (already loaded into the session when it can) and lets the language model decide whether to call a tool. The spoken answer goes back through LiveKit. If the real answer is not ready about two seconds after the driver stops, the worker says a short hold phrase first.

Login tokens come from `identity-service`. Other services check that token; they do not issue accounts. `llm-orchestrator` never reads DynamoDB. Twilio stays in `external-channel-service`.

## Names you will still see

Environment files accept both the current names and the older ones:

| Current | Older alias still accepted |
|---|---|
| `IDENTITY_SERVICE_URL` | `AUTH_SERVICE_URL` |
| `EXTERNAL_API_SERVICE_URL` | `TRIP_SERVICE_URL` |
| `CALL_RECORDS_SERVICE_URL` | `CALL_LOGGER_URL` |
| `EXTERNAL_CHANNEL_SERVICE_URL` | `CALL_CENTER_URL` |

Scripts under `src/e2e` still read `TRIP_SERVICE_URL`. The AWS log group for the voice worker is still `dev-driver-assistant-voice-agent`.
