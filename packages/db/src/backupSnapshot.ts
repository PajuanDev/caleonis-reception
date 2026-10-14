import { spawn } from "node:child_process";
import { Pool } from "pg";

export type BackupStorageObject = { key: string; size: number; checksum: string | null; contentType: string };
export type BackupDatabaseSnapshot = { dump: Buffer; objects: BackupStorageObject[]; startedAt: string; pendingObjects: number };

/** A PostgreSQL session lock prevents duplicate captures during rolling deploys. */
export async function withPilotBackupLock<T>(databaseUrl: string, run: () => Promise<T>): Promise<T | undefined> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000, application_name: "caleonis:backup-lock" });
  const client = await pool.connect().catch(async () => { await pool.end(); throw new Error("BACKUP_DATABASE_CONNECT_FAILED"); });
  let acquired = false;
  try {
    acquired = !!(await client.query<{ acquired: boolean }>("SELECT pg_try_advisory_lock(hashtext('caleonis:pilot-backup:v1')) AS acquired")).rows[0]?.acquired;
    if (!acquired) return undefined;
    return await run();
  } finally {
    if (acquired) await client.query("SELECT pg_advisory_unlock(hashtext('caleonis:pilot-backup:v1'))").catch(() => undefined);
    client.release();
    await pool.end();
  }
}

export function postgresProcessEnv(databaseUrl: string): NodeJS.ProcessEnv {
  const url = new URL(databaseUrl);
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") throw new Error("INVALID_BACKUP_DATABASE_URL");
  return { NODE_ENV: process.env.NODE_ENV ?? "development", PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, LANG: "C.UTF-8", PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get("sslmode") ?? "prefer", PGCONNECT_TIMEOUT: "10", PGAPPNAME: "caleonis:backup", PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=120000" };
}

export async function capturePostgresBackup(databaseUrl: string, options: { pgDumpPath?: string; maxBytes?: number } = {}): Promise<BackupDatabaseSnapshot> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1, connectionTimeoutMillis: 10_000, application_name: "caleonis:backup" });
  const client = await pool.connect().catch(async () => { await pool.end(); throw new Error("BACKUP_DATABASE_CONNECT_FAILED"); });
  try {
    const role = (await client.query<{ safe: boolean }>("SELECT (current_user = 'lobbystack_backup' AND rolbypassrls AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND rolcanlogin) AS safe FROM pg_roles WHERE rolname = current_user")).rows[0];
    if (!role?.safe) throw new Error("BACKUP_REQUIRES_DEDICATED_READONLY_ROLE");
    const permissions = (await client.query<{ writes: boolean }>("SELECT coalesce(bool_or(has_table_privilege(current_user, c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')), false) AS writes FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relkind IN ('r', 'p') AND n.nspname IN ('public', 'app', 'drizzle')")).rows[0];
    if (permissions?.writes) throw new Error("BACKUP_ROLE_HAS_WRITE_PERMISSION");
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    await client.query("SET LOCAL statement_timeout = '120s'");
    const snapshot = (await client.query<{ snapshot: string }>("SELECT pg_export_snapshot() AS snapshot")).rows[0]!.snapshot;
    const startedAt = new Date().toISOString();
    const objects = (await client.query<BackupStorageObject>('SELECT object_key AS key, content_length AS size, checksum, content_type AS "contentType" FROM public.storage_objects WHERE status = \'ready\' ORDER BY object_key')).rows;
    if (objects.some((object) => !Number.isSafeInteger(object.size) || object.size < 0)) throw new Error("BACKUP_INVALID_OBJECT_SIZE");
    const pendingObjects = Number((await client.query<{ count: string }>("SELECT count(*) FROM public.storage_objects WHERE status <> 'ready'")).rows[0]!.count);
    const dump = await new Promise<Buffer>((resolve, reject) => {
      const child = spawn(options.pgDumpPath ?? "pg_dump", ["--format=custom", "--compress=6", "--snapshot", snapshot], { env: postgresProcessEnv(databaseUrl), stdio: ["ignore", "pipe", "pipe"] });
      const chunks: Buffer[] = [];
      let bytes = 0;
      let warningBytes = 0;
      child.stdout.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > (options.maxBytes ?? 64 * 1024 * 1024)) { child.kill(); reject(new Error("BACKUP_DATABASE_SIZE_LIMIT")); return; }
        chunks.push(chunk);
      });
      // pg_dump may include credentials or SQL/PII in errors. Do not persist it.
      child.stderr.on("data", (chunk: Buffer) => { warningBytes += chunk.length; });
      child.once("error", () => reject(new Error("BACKUP_PG_DUMP_UNAVAILABLE")));
      child.once("exit", (code) => code === 0 && warningBytes === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(code === 0 ? "BACKUP_PG_DUMP_WARNING" : "BACKUP_PG_DUMP_FAILED")));
      const timeout = setTimeout(() => { child.kill(); reject(new Error("BACKUP_PG_DUMP_TIMEOUT")); }, 180_000);
      timeout.unref();
      child.once("exit", () => clearTimeout(timeout));
    });
    if (!dump.subarray(0, 5).equals(Buffer.from("PGDMP"))) throw new Error("BACKUP_INVALID_PG_ARCHIVE");
    await client.query("COMMIT");
    return { dump, objects, startedAt, pendingObjects };
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
    await pool.end();
  }
}
