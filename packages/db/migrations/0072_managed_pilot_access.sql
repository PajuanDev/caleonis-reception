-- A managed pilot can configure its own workspace, but paid checkout remains
-- operator-controlled until its commercial activation is approved separately.
-- This flag is intentionally absent from public business/update payloads.
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS managed_pilot boolean NOT NULL DEFAULT false;
