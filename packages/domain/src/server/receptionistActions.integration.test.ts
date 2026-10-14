import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { appointments, auditLogs, businessHours, businessMemberships, businesses, calls, contacts, conversations, createDatabaseClient, inboxItems, messages, notifications, operatorNotificationDeliveries, outboxMessages, services, staff, users, widgetVisitors, type Database, type DatabaseTransaction } from "@lobbystack/db";
import { bookForCaller, takeMessageForStaff } from "./receptionistActions";
import { startLiveWebCall } from "./liveCalls";
import { VOICE_RECORDING_CONSENT_VERSION } from "@lobbystack/shared";

// Explicit local-test opt-in. Never read a production connection or env file.
const testUrl = process.env.LOBBYSTACK_RELIABILITY_TEST_DATABASE_URL;
if (testUrl) {
  const url = new URL(testUrl);
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname) || !/test/i.test(url.pathname)) throw new Error("Receptionist integration tests require a dedicated local test database.");
}
const client = testUrl ? createDatabaseClient("lobbystack_migrator", { DATABASE_URL: testUrl }) : undefined;
afterAll(async () => { await client?.pool.end(); });

async function rollbackTest(run: (tx: DatabaseTransaction) => Promise<void>) {
  const rollback = new Error("rollback test fixture");
  try {
    await client!.db.transaction(async (tx) => { await run(tx); throw rollback; });
  } catch (error) { if (error !== rollback) throw error; }
}

async function workspace(tx: DatabaseTransaction) {
  const businessId = randomUUID();
  const userId = randomUUID();
  const email = `${userId}@example.invalid`;
  await tx.insert(businesses).values({ id: businessId, slug: businessId, name: "Pilot action test", timezone: "Europe/Paris", businessType: "test", telemetryEnabled: false });
  await tx.insert(users).values({ id: userId, email, normalizedEmail: email });
  await tx.insert(businessMemberships).values({ businessId, userId, role: "business_owner" });
  const visitorId = randomUUID();
  await tx.insert(widgetVisitors).values({ id: visitorId, businessId });
  const [conversation] = await tx.insert(conversations).values({ businessId, widgetVisitorId: visitorId, channel: "web_chat" }).returning({ id: conversations.id });
  return { businessId, userId, visitorId, conversationId: conversation!.id };
}

async function asWorker<T>(tx: DatabaseTransaction, run: (db: Database) => Promise<T>): Promise<T> {
  await tx.execute(sql`set local session authorization lobbystack_worker`);
  try { return await run(tx as unknown as Database); }
  finally { await tx.execute(sql`reset session authorization`); }
}

describe.skipIf(!testUrl)("pilot receptionist actions against PostgreSQL runtime roles", () => {
  it("records current consent evidence with the web call under the runtime worker role", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      const result = await asWorker(tx, (db) => startLiveWebCall({ db }, { businessId: w.businessId, sessionId: `test-${randomUUID()}`, widgetId: "lobbystack-landing", billable: false, recordingConsentVersion: VOICE_RECORDING_CONSENT_VERSION }));
      expect(await tx.select().from(auditLogs).where(and(eq(auditLogs.businessId, w.businessId), eq(auditLogs.entityId, result.callId)))).toEqual([expect.objectContaining({ eventType: "voice.recording_consent_accepted", payload: { noticeVersion: VOICE_RECORDING_CONSENT_VERSION, decision: "accepted", channel: "web_voice", widgetId: "lobbystack-landing" } })]);
    });
  });
  it("saves a visitor message, contact and pending email alert without inventing visitor chat messages", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      const result = await asWorker(tx, (db) => takeMessageForStaff({ db }, { businessId: w.businessId, conversationId: w.conversationId, channel: "web_chat", callerName: "Alice Pilot", callbackPhone: "+33612345678", message: "  Rappelez-moi pour un devis.  " }));
      expect(result).toMatchObject({ ok: true, status: "saved", notificationStatus: "queued" });
      const [item] = await tx.select().from(inboxItems).where(eq(inboxItems.businessId, w.businessId));
      expect(item?.body).toContain("Rappelez-moi pour un devis.");
      expect(item?.metadata).toMatchObject({ callerName: "Alice Pilot", callbackPhone: "+33612345678", channel: "web_chat" });
      const [contact] = await tx.select().from(contacts).where(eq(contacts.businessId, w.businessId));
      expect(contact).toMatchObject({ name: "Alice Pilot", phone: "+33612345678" });
      expect((await tx.select().from(conversations).where(eq(conversations.id, w.conversationId)))[0]?.contactId).toBe(contact!.id);
      expect((await tx.select().from(widgetVisitors).where(eq(widgetVisitors.id, w.visitorId)))[0]?.contactId).toBe(contact!.id);
      expect(await tx.select().from(messages).where(eq(messages.businessId, w.businessId))).toHaveLength(0);
      expect(await tx.select().from(operatorNotificationDeliveries).where(eq(operatorNotificationDeliveries.businessId, w.businessId))).toEqual([expect.objectContaining({ channel: "email", status: "pending", sentAt: null })]);
      expect(await tx.select().from(outboxMessages).where(and(eq(outboxMessages.businessId, w.businessId), eq(outboxMessages.topic, "notification.dispatch")))).toHaveLength(1);
    });
  });

  it("does not attach a claimed widget phone to someone else's historical contact", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      const [previous] = await tx.insert(contacts).values({ businessId: w.businessId, name: "Existing customer", phone: "+33612345678" }).returning();
      await asWorker(tx, (db) => takeMessageForStaff({ db }, { businessId: w.businessId, conversationId: w.conversationId, channel: "web_chat", callerName: "Unverified visitor", callbackPhone: "+33612345678", message: "A new request" }));
      const [conversation] = await tx.select().from(conversations).where(eq(conversations.id, w.conversationId));
      expect(conversation?.contactId).not.toBe(previous!.id);
      expect((await tx.select().from(contacts).where(eq(contacts.id, previous!.id)))[0]?.name).toBe("Existing customer");
      expect((await tx.select().from(inboxItems).where(eq(inboxItems.businessId, w.businessId)))[0]?.metadata?.callbackPhone).toBe("+33612345678");
    });
  });

  it("persists an anonymous voice caller's callback details without overwriting known contacts", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      const [contact] = await tx.insert(contacts).values({ businessId: w.businessId }).returning();
      await tx.update(conversations).set({ contactId: contact!.id, widgetVisitorId: null, channel: "voice" }).where(eq(conversations.id, w.conversationId));
      await asWorker(tx, (db) => takeMessageForStaff({ db }, { businessId: w.businessId, conversationId: w.conversationId, channel: "web_voice", callerName: "Alice Browser", callbackPhone: "+33612345678", message: "A real callback request" }));
      expect((await tx.select().from(contacts).where(eq(contacts.id, contact!.id)))[0]).toMatchObject({ name: "Alice Browser", phone: "+33612345678" });
    });
  });

  it("rejects another tenant's conversation before saving any caller data", async () => {
    await rollbackTest(async (tx) => {
      const a = await workspace(tx);
      const b = await workspace(tx);
      await expect(asWorker(tx, (db) => takeMessageForStaff({ db }, { businessId: a.businessId, conversationId: b.conversationId, channel: "web_chat", callerName: "Injected", callbackPhone: "+33612345678", message: "Wrong tenant" }))).rejects.toThrow("Conversation not found in this business");
      expect(await tx.select().from(inboxItems).where(eq(inboxItems.businessId, a.businessId))).toHaveLength(0);
      expect(await tx.select().from(contacts).where(eq(contacts.businessId, a.businessId))).toHaveLength(0);
    });
  });

  it("rolls back the staff note and contact when the durable task cannot be saved", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      await tx.update(conversations).set({ channel: "voice", widgetVisitorId: null }).where(eq(conversations.id, w.conversationId));
      await tx.execute(sql`create function pg_temp.reject_pilot_task() returns trigger language plpgsql as $$ begin raise exception 'injected pilot task failure'; end $$`);
      await tx.execute(sql`create trigger pilot_action_failure before insert on inbox_items for each row execute function pg_temp.reject_pilot_task()`);
      await expect(asWorker(tx, (db) => takeMessageForStaff({ db }, { businessId: w.businessId, conversationId: w.conversationId, channel: "voice", callerName: "Rollback caller", callbackPhone: "+33612345678", message: "Must not partially persist" }))).rejects.toThrow();
      expect(await tx.select().from(messages).where(eq(messages.businessId, w.businessId))).toHaveLength(0);
      expect(await tx.select().from(contacts).where(eq(contacts.businessId, w.businessId))).toHaveLength(0);
      expect(await tx.select().from(operatorNotificationDeliveries).where(eq(operatorNotificationDeliveries.businessId, w.businessId))).toHaveLength(0);
    });
  });

  it("keeps a trusted caller's identity and deduplicates repeat task notifications", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      const [contact] = await tx.insert(contacts).values({ businessId: w.businessId, name: "Known caller", phone: "+33611111111" }).returning();
      await tx.update(conversations).set({ contactId: contact!.id, channel: "voice", widgetVisitorId: null }).where(eq(conversations.id, w.conversationId));
      const [call] = await tx.insert(calls).values({ businessId: w.businessId, contactId: contact!.id, conversationId: w.conversationId, providerCallId: randomUUID(), transport: "sip", startedAt: new Date() }).returning();
      const input = { businessId: w.businessId, conversationId: w.conversationId, callId: call!.id, channel: "voice" as const, callerName: "Different supplied name", callbackPhone: "+33622222222", message: "Please use the alternate callback number." };
      const first = await asWorker(tx, (db) => takeMessageForStaff({ db }, input));
      const second = await asWorker(tx, (db) => takeMessageForStaff({ db }, input));
      expect(first.ok && second.ok && first.inboxItemId).toBe(second.ok && second.inboxItemId);
      expect((await tx.select().from(contacts).where(eq(contacts.id, contact!.id)))[0]).toMatchObject({ name: "Known caller", phone: "+33611111111" });
      expect(await tx.select().from(inboxItems).where(eq(inboxItems.businessId, w.businessId))).toHaveLength(1);
      expect(await tx.select().from(messages).where(eq(messages.businessId, w.businessId))).toHaveLength(1);
      expect(await tx.select().from(operatorNotificationDeliveries).where(eq(operatorNotificationDeliveries.businessId, w.businessId))).toHaveLength(1);
    });
  });

  it("books in the internal calendar once and reports external notifications as undelivered", async () => {
    await rollbackTest(async (tx) => {
      const w = await workspace(tx);
      await tx.insert(staff).values({ businessId: w.businessId, name: "Pilot operator", timezone: "Europe/Paris" });
      await tx.insert(services).values({ businessId: w.businessId, name: "Consultation", slug: "consultation", durationMinutes: 30 });
      await tx.insert(businessHours).values(Array.from({ length: 7 }, (_, dayOfWeek) => ({ businessId: w.businessId, dayOfWeek, openMinutes: 0, closeMinutes: 1440 })));
      const input = { businessId: w.businessId, serviceName: "Consultation", startsAt: "2030-01-08T10:00:00Z", timezone: "Europe/Paris", contactName: "Alice Pilot", contactPhone: "+33612345678", smsConsentGranted: false, channel: "web_chat" as const };
      await expect(asWorker(tx, (db) => bookForCaller({ db }, input))).resolves.toMatchObject({ ok: true, status: "confirmed", calendar: "internal", notificationStatus: "queued_not_delivered" });
      await expect(asWorker(tx, (db) => bookForCaller({ db }, input))).resolves.toMatchObject({ ok: false });
      expect(await tx.select().from(appointments).where(eq(appointments.businessId, w.businessId))).toHaveLength(1);
      expect(await tx.select().from(notifications).where(eq(notifications.businessId, w.businessId))).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "booking_confirmation", status: "pending", providerMessageId: null })]));
    });
  });
});
