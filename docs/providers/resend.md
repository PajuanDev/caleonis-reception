# Configure transactional email

LobbyStack sends authentication and operational email through the worker's selected provider. The current flows include verification, password reset, email changes, notifications, and feedback delivery.

## Resend HTTPS on networks that block SMTP

Set `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` to a sending key restricted to the verified sending domain, and `EMAIL_FROM` on the worker. `EMAIL_REPLY_TO` is optional. The default `EMAIL_PROVIDER=smtp` preserves the existing SMTP path. An incomplete explicit Resend configuration fails startup instead of silently falling back.

The HTTPS adapter uses `https://api.resend.com/emails`, the existing message templates, a hashed stable `Idempotency-Key`, and the provider's email ID as the receipt. It never retries internally. HTTP 429 may be retried by the existing bounded worker policy with the same key, only after any notification claim is confirmed released; a failed release stops for review. Before every POST, the original BullMQ enqueue timestamp must be present and younger than 23 hours, so a stalled job cannot outlive the provider's 24-hour idempotency window. Network timeouts, lost or invalid success receipts, HTTP 409/5xx, and permanent provider rejections stop BullMQ retries for operator review. Failure to persist a successful receipt also stops retries, retaining an opaque receipt reference in the terminal queue error. Cleanup failures preserve terminal Resend errors. Unknown outcomes are never replayed automatically.

Before enabling delivery, check old pending notifications and queued/retrying jobs. Do not replay published legacy outbox entries or terminal jobs. Verify one explicitly authorized recipient through the real outbox and worker, then inspect the corresponding provider receipt and actual receiving inbox. Queue completion alone does not prove delivery. The existing execution-receipt recovery and migration guards stay unchanged.

A Resend notification retry that cannot acquire its SQL claim reads only channel/status/receipt. Email already sent with a receipt or explicitly skipped may finish without sending; processing and unknown states stop for manual review without acknowledging the outbox. SMTP and SMS claim behavior stays unchanged. A process crash between HTTP acceptance and receipt persistence can still lose the provider ID. Reconcile that uncertain execution manually against Resend before any further action; the bounded idempotency mechanism does not provide an indefinite exactly-once guarantee.

References: [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys), [Railway outbound email restrictions](https://docs.railway.com/networking/outbound-networking).

## Configure the environment

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USERNAME`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` when replies should go elsewhere
- `APP_BASE_URL` for links in email
- `FEEDBACK_TO_EMAIL` for dashboard feedback delivery
- `ONBOARDING_FOLLOWUP_FROM` and `ONBOARDING_FOLLOWUP_SENDER_NAME` for the founder check-in email (worker only)

For local development, start Mailpit with `docker compose --env-file .env --profile development up -d mailpit` and point SMTP at port `1025`.

## Verification

1. Start PostgreSQL, Redis, admin, worker, and the SMTP provider.
2. Open `/forgot-password` and request a reset.
3. Confirm the worker consumes the email outbox job.
4. Open the message and complete the reset flow.
5. Repeat with signup verification and email change.
6. Submit dashboard feedback and confirm asynchronous delivery to `FEEDBACK_TO_EMAIL`.

## Operate email in production

- Use a verified sender domain with SPF and DKIM.
- Keep SMTP credentials on admin/worker server runtimes only.
- Monitor outbox retries and dead-letter jobs.
- Store feedback before attempting delivery so provider outages do not lose submissions.

## Send the onboarding check-in email

The worker emails each new owner 24 hours after they finish onboarding and asks what they thought of LobbyStack. It skips owners who came back: a sign-in or any call more than an hour after onboarding counts as a return. It also skips owners whose email domain matches the sender's, so your team's test accounts don't get it.

Set both variables on the worker to turn it on:

- **`ONBOARDING_FOLLOWUP_FROM`**: the sender, such as `Raphael from LobbyStack <raphael@lobbystack.com>`. Replies go to this address, so use an inbox you read. The domain must be verified in Resend.
- **`ONBOARDING_FOLLOWUP_SENDER_NAME`**: the first name used in the email body and signature, such as `Raphael`.

Leave either one empty to turn the email off. Each workspace gets the email at most once, and workspaces that finished onboarding before this feature shipped never get it.
