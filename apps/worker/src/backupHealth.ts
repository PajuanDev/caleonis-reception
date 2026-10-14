export type BackupHealthState = { enabled: boolean; running: boolean; lastSuccessAt: number | null; lastCheckedAt: number | null; lastFailureCode: string | null };

export function backupHealthReport(state?: BackupHealthState, now = Date.now()) {
  const enabled = state?.enabled ?? false;
  const ageSeconds = state?.lastSuccessAt !== null && state?.lastSuccessAt !== undefined ? Math.max(0, Math.floor((now - state.lastSuccessAt) / 1000)) : null;
  const ok = enabled && ageSeconds !== null && ageSeconds <= 26 * 60 * 60 && !state?.lastFailureCode;
  const status = !enabled ? "disabled" : state?.lastFailureCode ? "failed" : ageSeconds === null ? "never_succeeded" : !ok ? "stale" : "fresh";
  return { ok, status, enabled, running: state?.running ?? false, lastSuccessAt: state?.lastSuccessAt ? new Date(state.lastSuccessAt).toISOString() : null, ageSeconds, lastCheckedAt: state?.lastCheckedAt ? new Date(state.lastCheckedAt).toISOString() : null, failureCode: state?.lastFailureCode ?? null };
}
