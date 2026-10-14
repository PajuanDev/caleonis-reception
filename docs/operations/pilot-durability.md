# Pilot durability — implementation and activation gate

The P0 worker now writes PostgreSQL execution receipts for each newly dispatched
outbox message when `OUTBOX_EXECUTION_RECEIPTS_ENABLED=true`. Keep this flag
disabled for the first deployment, drain/remove every older worker consumer,
then activate it with only receipt-aware worker revisions running. Older workers
cannot provide the new receipts; their jobs must never be assumed unstarted.
Redis remains the queue transport. Every minute, a bounded batch
of 50 published, uncompleted messages is checked against BullMQ. A missing job
that never started is re-enqueued with the same business idempotency key. Before
replay, PostgreSQL atomically checks the current receipt and advances a delivery
version; the older job can no longer start or acknowledge it. The replay's job ID
includes this version to avoid an old Redis job colliding with the new delivery.
A completed job is acknowledged in PostgreSQL. Failed jobs, or
missing jobs whose handler already started, are quarantined in the existing
dead-letter column. An acknowledgement failure after a handler succeeded is
terminal in BullMQ, so it cannot automatically repeat the side effect.

This detects ambiguity; it does not provide exactly-once delivery to an external
provider. Review the provider's receipt before retrying a quarantined email,
booking, payment or provisioning operation. Previously published rows are
deliberately untracked, because replaying old history could repeat a side effect.
Previously attempted untracked pending rows also remain untracked: an older
consumer may have executed them after enqueue succeeded but publication failed.
Only a first claim (`attempts=0`) gains tracking; an already tracked retry keeps
its receipt. Resolve ambiguous legacy retries using provider evidence before
making any manual delivery decision.
The additive migration is `0071_outbox_execution_receipts.sql`; deploy the
migration before the updated worker/admin. Before rolling back to an older
consumer, stop new dispatch/recovery and drain every queued or active job carrying
an outbox receipt using the current receipt-aware runtime. Reconcile quarantined
tracked rows before any replay. No receipt job may be consumed by an older
runtime; merely setting the activation flag to false does not remove receipts
from existing jobs. Retain the additive columns when rolling back application
code. If the drain cannot be proven complete, keep receipt-aware consumers until
the operator resolves it.

## Backup prepared on the existing worker

`BACKUP_ENABLED` defaults to disabled. When explicitly enabled, the existing
worker checks every 15 minutes and takes a backup if no successful copy is newer
than 24 hours. Expensive retries have a six-hour minimum, persisted in owned S3
control metadata across restarts. An exclusive conditional object reserves each
six-hour UTC slot; an unavailable metadata store prevents capture. In-process
errors also impose the six-hour floor. There is no new Railway service and no
change to the subscription.
Use one backup-enabled replica; a PostgreSQL advisory lock also prevents overlap
during rolling deployments. The worker image includes
`pg_dump`/`pg_restore` 16, matching the existing PostgreSQL 16 production database.
Its Docker build runs both version checks. The PostgreSQL 16 tooling image is
pinned to the Docker Hub registry digest resolved on 14 October 2026.

The capture uses an exported read-only MVCC snapshot for both the database dump
and the list of READY storage objects. WAV and knowledge files are processed one
at a time, checked against recorded size/checksum, compressed with gzip level 6,
and encrypted into a shared private blob keyed by original SHA256 and recovery
key fingerprint. An unchanged object reuses its verified ciphertext; the original
WAV is never changed. Each daily generation holds its own PostgreSQL dump and
encrypted manifest. The
encrypted manifest contains the source-key mapping and plaintext SHA256 values.
Each encrypted upload is downloaded again and its SHA256 verified. Only then is
a small receipt committed under `_recovery/pilot-v1/<generation>/receipt.json`.
The format is now `caleonis-pilot-backup-v2`; the prefix stays stable. Receipts
contain shared blob references and transfer/storage byte counts, with no original
source keys. Original source keys remain inside the encrypted manifest only.
No successful receipt is written for a missing file, warning, size violation or
failed readback. Pending storage rows are counted explicitly; incomplete uploads
are not claimed to be restored.

Each file receives a random AES-256-GCM key wrapped with RSA-OAEP-SHA256. Only an
RSA SPKI public key of at least 3072 bits belongs in Railway. Private-key PEM
input is explicitly rejected by the configuration parser. The recovery private key
must be retained offline, in two controlled locations outside the Railway
project. Keep a separate offline recovery copy of application encryption/auth
secrets and the role bootstrap procedure; `pg_dump` does not include cluster
role passwords. The dump retains ACLs and RLS policies. Anonymous S3 access must
remain forbidden. Using the same private bucket improves deployment recovery but
does not protect against deletion of the entire project/account; retain the
verified offline backup and arrange a separate-account copy before claiming
account-disaster recovery.

Required variables (values are secrets; never paste them into a report):

| Variable | Purpose |
| --- | --- |
| `BACKUP_ENABLED=true` | Explicit activation after cost/key/restore validation |
| `BACKUP_DATABASE_URL` | Dedicated `lobbystack_backup` connection; no runtime/migrator root credential |
| `BACKUP_RECOVERY_PUBLIC_KEY` | RSA SPKI PEM public key; actual newlines or escaped `\n` |
| `BACKUP_MAX_SNAPSHOT_BYTES` | Default 256 MiB raw; configurable up to 1 GiB raw; individual dump/object capped at 64 MiB |
| `BACKUP_MAX_STORED_BYTES` | Firm maximum 512 MiB across the owned prefix, including control metadata, shared blobs, dumps and manifests |
| `BACKUP_RETENTION_DELETE_APPROVED` | Defaults false; separately approved deletion of old owned generations |
| `BACKUP_PG_DUMP_PATH` | Optional alternate PG16 executable path |

Provision the role using `scripts/operations/provision-backup-role.sql` only after
the operator verifies the exact target. Then set its LOGIN password via a secret
manager and grant CONNECT only to the intended database. It is unprivileged for
writes/role creation, but deliberately has BYPASSRLS to read all tenants. Audit
schema/function grants and the migration owner when enabling it. The operator
has provisioned the dedicated production role during the authorized read-only
preflight; connection/dump evidence is retained separately. This does not imply
that the scheduler has been activated.

The default retention target is seven completed daily generations. Deletion is
disabled without separate approval; reaching the storage cap blocks the next
capture with `BACKUP_STORAGE_BUDGET_REACHED`. When deletion is approved, only
valid owned generations older than seven days are eligible and the latest seven
complete copies are always preserved. Foreign prefixes and all prior manually
created backups are preserved. Partial generations older than seven days can be
pruned under the same approved prefix policy. A shared blob is preserved while
any retained receipt references it. Once no retained generation references it,
the module starts a seven-day grace marker; only after that grace can its generated
ciphertext, metadata and marker be deleted. Re-referencing clears that marker.
Original recordings and foreign prefixes are never part of this pruning.
All owned PUTs, including attempt/outcome metadata, use the same measured byte
budget under the PostgreSQL backup lock. Generated data leaves small control
headroom while the overall limit stays firm. Inspect worker logs for the success
receipt and alert externally if the latest success is older than 26 hours or if
`pilot encrypted backup failed` appears. `/health/backup` returns 503 for disabled,
never successful, failed or stale (>26 hours) backups and 200 for a fresh verified
copy, including last-success time and a safe failure code. The operator must
check this endpoint and the last receipt after activation. The endpoint does not
send notifications; an external recurring alert is a remaining operational risk.

## Isolated restoration drill

1. Generate the recovery key offline and retain the private key outside Railway.
2. Run one encrypted capture and download its generation plus every shared blob
   referenced by its private receipt. Preserve this local layout:
   `_recovery/pilot-v1/<generation>/{postgres.dump.enc,manifest.json.enc,receipt.json}`
   and `_recovery/pilot-v1/blobs/<key-fingerprint>/<original-sha256>.gz.enc`.
   The generation directory and `blobs` directory share the same parent. Previous
   v1 generations keep their original in-generation object paths and remain readable.
3. Run `pnpm exec tsx scripts/operations/pilot-backup-decrypt.ts <generation-dir>
   <private-key.pem> <new-private-output-dir>`. This verifies each AEAD tag and
   both ciphertext and original plaintext SHA256 hashes after bounded gunzip.
   It canonicalizes the output parent, rejects output inside ciphertext including
   Windows case/junction variants, creates a protected new output directory,
   and requires exactly one PostgreSQL custom archive. At most 1001 files and
   1 GiB raw are restored locally. It never accepts a database connection.
4. Bootstrap runtime roles in an empty, isolated PostgreSQL 16/pgvector database
   with no worker and no external-provider credentials. Restore `postgres.dump`
   using `pg_restore --exit-on-error --single-transaction --no-owner`; retain ACLs.
   Do not use `--clean` against any populated database.
5. Validate schema/migration checks, RLS under actual app/worker/dispatcher roles,
   fixture contacts/appointments/message history, and the restored file hashes
   from `restore-manifest.json`. Restore files only into a new isolated private
   bucket. Reconcile all READY rows against those copied objects.
6. Record elapsed capture/restore time, bytes, hashes and results without secrets.
   Retain the current verified offline copy until a complete new drill passes.

The current existing private database/object backup and PostgreSQL restoration
evidence remain valid for their timestamps. Unit tests verify this new encrypted
format and retention guards. The operator has also completed two real local v2
captures from the verified private baseline, decryption of eight files per
generation, and isolated PostgreSQL restoration (77 tables, 907 rows, 75 RLS
tables and 12 role probes). Those are drill results; the recurring production
scheduler is still awaiting rollout.

## Cost gate

Measured baseline on 14 October 2026: approximately 0.515 MB database archive and
53,395,508 bytes of READY WAV data compressed to 27,573,339 bytes (ratio 0.516),
with originals unchanged. The real v2 local capture stored 27,643,352 bytes on
its first generation; a second generation reused the same seven blobs and added
523,008 bytes. Total: 28,166,360 bytes. Seven generations therefore retain one
copy of each unchanged object plus seven small dumps/manifests. These measurements
establish the observed baseline, not a guarantee for new callers or every WAV.
A 512 MiB cap bounds stored copies but does
not fix compute/network cost. With the currently documented Railway bucket rate
of $0.015/GB-month (rounded to whole GB-month), that footprint is approximately
$0.015/month storage. At the measured unchanged baseline, one initial upload of
about 27.64 MB followed by approximately 0.523 MB/day is about 43 MB in the first
30 days, approximately $0.0022 at $0.05/GB service egress, plus measured worker
CPU/RAM and all new objects. Bucket operations
and bucket egress are documented as free. These estimates exclude existing
subscriptions, taxes and changes in volume; validate the live bill before any
activation. Sources: [Railway pricing](https://docs.railway.com/pricing),
[bucket billing](https://docs.railway.com/storage-buckets/billing),
[PostgreSQL 16 backup snapshot behavior](https://www.postgresql.org/docs/16/app-pgdump.html).

The operator approved up to $1/month of additional backup usage and deletion of
owned generated backups older than seven days on 14 October 2026. Production
activation still requires a measured run within that cap, the offline key being
controlled, the role and image validated, and the operator's post-activation
health check. An outgoing recurring failure alert remains to be connected.
Redis volume/AOF `appendfsync everysec` plus `maxmemory-policy
noeviction` is still recommended to reduce interrupted-active-job uncertainty;
adding a volume changes billable storage and needs its own authorization. Never
flush production Redis to test recovery.

## Orphan metadata repair

`BACKUP_BLOB_METADATA_MISSING` preserves the ciphertext and all earlier complete
generations. This can occur if an upload completed but its metadata PUT failed.
Do not overwrite or delete that blob blindly. Download the ciphertext and, on
the offline recovery workstation, decrypt it with the correct retained private
key, gunzip with a 64 MiB output limit, and verify the original SHA256 against
the blob filename and expected database object checksum. Verify that the key's
public SPKI fingerprint matches the blob directory. Record encrypted SHA256,
encrypted length, original length and the checked fingerprint. An operator can
then recreate only the missing generated metadata JSON with format
`caleonis-pilot-blob-v2`, those verified fields, `compression=gzip` and the current
UTC creation time. Upload the metadata with exclusive creation and the same
512 MiB budget. This repairs an interrupted capture without changing original
WAVs or any existing ciphertext. If verification fails, retain the old copies
and escalate instead of marking the blob valid.
