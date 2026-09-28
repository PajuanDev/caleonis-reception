# Caleonis Reception — Railway V1 deployment

This repository is the Caleonis Reception fork of LobbyStack.

## Phase 1 — prove the product without phone carrier setup

Deploy these resources in Railway, preferably in the EU West region:

- admin — `Dockerfile.admin`
- worker — `Dockerfile.worker`
- migrator — `Dockerfile.migrator`
- PostgreSQL 16 with pgvector
- Redis 7
- S3-compatible object storage / Railway Bucket

The first milestone is a working browser voice test from the dashboard. Twilio, Google Calendar, SMTP and billing can be added after this milestone.

### Required application secrets

Generate independent random values of at least 32 characters for:

- `BETTER_AUTH_SECRET`
- `INTERNAL_SERVICE_SECRET`
- `INTERNAL_SERVICE_TOKEN`
- `ENCRYPTION_KEY`
- `OTP_HASH_SECRET`
- `WIDGET_SESSION_SECRET`

With S3 storage enabled, `LOCAL_STORAGE_SIGNING_SECRET` is not required.

### Required provider credential for voice demo

- `OPENAI_API_KEY`

### Runtime

Use:

- `NODE_ENV=production`
- `DEPLOYMENT_MODE=self_hosted_standard`
- `LIVE_PROTOTYPE_ENABLED=true`
- `REQUIRE_EMAIL_VERIFICATION=false`
- `WIDGET_KEY_ISSUANCE_ENABLED=false`

Admin must expose a public HTTPS domain. Worker remains private.

Set:

- `APP_BASE_URL=https://<admin-domain>`
- `SITE_URL=https://<admin-domain>`
- `AUTH_TRUSTED_ORIGINS=https://<admin-domain>`
- `WORKER_INTERNAL_URL=http://<worker-private-domain>:3002`

Database role URLs and Redis should use Railway private networking.

## Phase 2 — real phone calls

After the browser voice flow works:

1. Create/configure a Twilio account.
2. Create an Elastic SIP trunk.
3. Route the trunk to the OpenAI project's SIP endpoint.
4. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_SIP_TRUNK_SID`.
5. Create the OpenAI incoming-call webhook pointing to:
   `https://<admin-domain>/api/webhooks/openai/live`
6. Store its signing secret as `OPENAI_WEBHOOK_SECRET`.
7. Set:
   - `TWILIO_SMS_WEBHOOK_URL=https://<admin-domain>/api/webhooks/twilio/sms`
   - `TWILIO_STATUS_CALLBACK_URL=https://<admin-domain>/api/webhooks/twilio/status`

## Phase 3 — business integrations

Add only after the call path is stable:

- Google Calendar
- SMTP / transactional email
- billing
- analytics
- Firecrawl / website knowledge import
- custom domain `reception.caleonis.com`

## Health checks

- admin: `/api/health/ready`
- worker: `/health/ready`

Do not send production traffic until both are healthy and the migrator has completed successfully.
