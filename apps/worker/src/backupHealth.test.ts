import { describe, expect, it } from "vitest";
import { backupHealthReport, type BackupHealthState } from "./backupHealth";

const now = Date.parse("2026-10-14T22:00:00Z");
const state: BackupHealthState = { enabled: true, running: false, lastSuccessAt: now - 60_000, lastCheckedAt: now, lastFailureCode: null };
describe("backup recovery health", () => {
  it("reports disabled or never successful backups as unqualified", () => {
    expect(backupHealthReport(undefined, now)).toMatchObject({ ok: false, status: "disabled" });
    expect(backupHealthReport({ ...state, lastSuccessAt: null }, now)).toMatchObject({ ok: false, status: "never_succeeded" });
  });
  it("reports a verified recent copy as fresh and flags stale or failed schedules", () => {
    expect(backupHealthReport(state, now)).toMatchObject({ ok: true, status: "fresh", ageSeconds: 60 });
    expect(backupHealthReport({ ...state, lastSuccessAt: now - 27 * 60 * 60_000 }, now)).toMatchObject({ ok: false, status: "stale" });
    expect(backupHealthReport({ ...state, lastFailureCode: "BACKUP_STORAGE_BUDGET_REACHED" }, now)).toMatchObject({ ok: false, status: "failed" });
  });
});
