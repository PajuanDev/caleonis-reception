-- Apply explicitly as a database administrator after a validated snapshot.
-- This is NOT a migration or runtime role: only the backup worker may use it.
-- Supply the password separately with a secret manager; never commit it here.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lobbystack_backup') THEN
    RAISE EXCEPTION 'Backup role already exists; inspect it before any alteration';
  END IF;
  CREATE ROLE lobbystack_backup NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT BYPASSRLS;
END $$;
-- Explicit data-read grants; no membership in a role that could write.
GRANT USAGE ON SCHEMA public, app TO lobbystack_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public, app TO lobbystack_backup;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, app TO lobbystack_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, app GRANT SELECT ON TABLES TO lobbystack_backup;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public, app GRANT SELECT ON SEQUENCES TO lobbystack_backup;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'drizzle') THEN
    GRANT USAGE ON SCHEMA drizzle TO lobbystack_backup;
    GRANT SELECT ON ALL TABLES IN SCHEMA drizzle TO lobbystack_backup;
    GRANT SELECT ON ALL SEQUENCES IN SCHEMA drizzle TO lobbystack_backup;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA drizzle GRANT SELECT ON TABLES TO lobbystack_backup;
    ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA drizzle GRANT SELECT ON SEQUENCES TO lobbystack_backup;
  END IF;
END $$;
ALTER ROLE lobbystack_backup SET default_transaction_read_only = on;
ALTER ROLE lobbystack_backup SET statement_timeout = '120s';
ALTER ROLE lobbystack_backup SET idle_in_transaction_session_timeout = '240s';
