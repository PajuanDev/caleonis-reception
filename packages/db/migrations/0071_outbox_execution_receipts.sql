-- Additive only. Old published messages remain untracked: automatically replaying
-- them could repeat an email, payment, SMS or number provisioning operation.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.outbox_messages
  ADD COLUMN IF NOT EXISTS delivery_tracked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delivery_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS execution_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS recovery_checked_at timestamptz;
CREATE INDEX IF NOT EXISTS outbox_uncompleted_delivery_idx
  ON public.outbox_messages (recovery_checked_at NULLS FIRST, published_at, id)
  WHERE delivery_tracked AND completed_at IS NULL AND dead_lettered_at IS NULL;
