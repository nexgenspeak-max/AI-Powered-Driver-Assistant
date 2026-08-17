# auth-service

Central identity service for the project. Owns the `accounts` table — one record per
account (`admin` | `driver` | `customer`), issues/verifies JWTs, and is the only
service allowed to write account data. `trip-service` reads/updates driver profile and
status through this service's API rather than keeping its own copy.

A single phone number can hold **two separate accounts** (e.g. one person who is both
a driver and a customer) — they are independent accounts with independent passwords,
looked up by `(phone, role)`, not `phone` alone.

## Local dev

### 1. Create the DynamoDB table (one-time)

```bash
aws dynamodb create-table \
  --table-name local-driver-assistant-accounts \
  --attribute-definitions \
    AttributeName=id,AttributeType=S \
    AttributeName=phone,AttributeType=S \
    AttributeName=email,AttributeType=S \
    AttributeName=role,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes '[
    {"IndexName":"phone-index","KeySchema":[{"AttributeName":"phone","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},
    {"IndexName":"email-index","KeySchema":[{"AttributeName":"email","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}},
    {"IndexName":"role-index","KeySchema":[{"AttributeName":"role","KeyType":"HASH"}],"Projection":{"ProjectionType":"ALL"}}
  ]' \
  --profile <your-aws-profile> --region ap-southeast-1
```

Also create the `driver-settings` table (one row per account — hands-free mode, pickup-approach
notification, next-stop auto-suggest; keyed by `id_account`, no GSIs needed). A row is created
automatically for every account at registration, with every toggle defaulted to `false`:

```bash
aws dynamodb create-table \
  --table-name local-driver-assistant-driver-settings \
  --attribute-definitions AttributeName=id_account,AttributeType=S \
  --key-schema AttributeName=id_account,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --profile <your-aws-profile> --region ap-southeast-1
```

### 2. Create `envs/.env.local`

This file is gitignored — it won't come from `git pull`, you have to create it yourself:

```env
ENV=local
AWS_REGION=ap-southeast-1
AWS_PROFILE=<your-aws-profile>

DYNAMODB_TABLE=local-driver-assistant-accounts
DYNAMODB_SETTINGS_TABLE=local-driver-assistant-driver-settings
JWT_SECRET=local-dev-secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
```

**`JWT_SECRET` must be the exact same value in `trip-service/envs/.env.local` and
`voice-agent/envs/.env.local` too** — all three services verify tokens with this one
shared secret. There's no automatic sync; copy the value by hand into all three files.

### 3. Start the service

```bash
cd src/backend/auth-service
npm install
npm run dev   # listens on :8003
```

### 4. Test the flow

```bash
# Register a driver (email + password + vehicle info are required for this role)
curl -X POST http://localhost:8003/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "role": "driver", "name": "Nguyễn Văn A", "phone": "+84901234567",
    "email": "a@example.com", "password": "secret123",
    "vehicle_type": "Xe máy", "vehicle_plate": "59-X1 123.45", "vehicle_name": "Honda Wave"
  }'

# Log in (role must match the account's actual role — a customer account cannot log
# in with role=driver, even with the correct password)
curl -X POST http://localhost:8003/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"role": "driver", "phone": "+84901234567", "password": "secret123"}'

# Whoami
curl http://localhost:8003/api/v1/auth/me -H "Authorization: Bearer <access_token>"
```

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `POST` | `/api/v1/auth/register` | — | Create an account. Admin needs email+password. Driver/customer need phone+email+password; driver additionally needs `vehicle_type`, `vehicle_plate`, `vehicle_name` |
| `POST` | `/api/v1/auth/login` | — | phone+password (driver/customer) or email+password (admin), scoped to the requested role |
| `POST` | `/api/v1/auth/refresh` | — | Exchange a refresh token for a new access+refresh pair (rotates; old refresh token stops working) |
| `GET` | `/api/v1/auth/me` | Bearer | Current account, sanitized |
| `GET` | `/api/v1/accounts?role=driver` | Bearer | List accounts by role (used by trip-service to list/find drivers) |
| `GET` | `/api/v1/accounts/phone/:phone` | Bearer | Look up one account by phone (any role) |
| `PATCH` | `/api/v1/accounts/:id` | Bearer | Update profile fields and/or `status`. Self can set `online`/`offline` on their own account; only `role=admin` can set `locked` or edit someone else's account |
| `GET` | `/api/v1/settings/:accountId` | Bearer | Read an account's feature settings (hands-free mode, pickup-approach notification + radius, next-stop auto-suggest + radius), row keyed by `id_account`. A row is created automatically at registration with every toggle `false`; if one is somehow missing (e.g. a pre-existing account), the same all-`false` defaults are returned instead of `null`/404 — so a fresh login or app reinstall always gets a consistent answer straight from the DB. Self or `role=admin` only |
| `PATCH` | `/api/v1/settings/:accountId` | Bearer | Update one or more settings fields (`true`/`false` to turn a feature on/off, or a radius override). Self or `role=admin` only |

## Roles, status, tokens

- **Roles**: `admin` (permissions `["*"]`), `driver`, `customer`. Same phone can own one
  account per role.
- **Status**: `online` | `offline` | `locked`. `locked` blocks login (`403`) regardless
  of password correctness — only an admin token can set it.
- **Tokens**: access token 15m, refresh token 30d. Every login/register/refresh call
  rotates the refresh token and stores its hash + expiry on the account — presenting an
  old, already-rotated refresh token is rejected even if it hasn't technically expired.

## Deploy

```bash
bash infra/auth-service/deploy.sh dev
# Output: ApiUrl → copy into trip-service/envs/.env.dev as AUTH_SERVICE_URL,
# and make sure JwtSecret passed here matches trip-service's and voice-agent's.

bash infra/auth-service/teardown.sh dev   # DynamoDB table is kept (DeletionPolicy: Retain)
```

Requires AWS SAM CLI and `esbuild` on `PATH` (`npm install -g esbuild` if `sam build`
fails with "Cannot find esbuild").
