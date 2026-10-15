import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";

import { contacts, conversations, messages, phoneNumbers, widgetVisitors } from "@lobbystack/db";
import { appendMessage, setAutomationState } from "@lobbystack/domain";
import { asApiResponse, businessIdFromRequest, jsonError, readJson, withOperatorTransaction } from "@/lib/api-helpers";
import { createDomainContext } from "@/lib/domain-context";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try { return NextResponse.json(await withOperatorTransaction(request, async ({ businessId, tx }) => ({ messages: await tx.select({ id: messages.id, conversationId: messages.conversationId, contactName: contacts.name, contactPhone: contacts.phone, visitorName: widgetVisitors.name, visitorEmail: widgetVisitors.email, channel: conversations.channel, automationState: conversations.automationState, body: messages.body, direction: messages.direction, status: messages.status, createdAt: messages.createdAt }).from(messages).leftJoin(conversations, eq(messages.conversationId, conversations.id)).leftJoin(contacts, eq(conversations.contactId, contacts.id)).leftJoin(widgetVisitors, eq(conversations.widgetVisitorId, widgetVisitors.id)).where(eq(messages.businessId, businessId)).orderBy(desc(messages.createdAt)).limit(200) }))); } catch (error) { return asApiResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await readJson(request) as { conversationId?: string; body?: string; channel?: "sms" | "dashboard" | "web_chat" };
    const businessId = businessIdFromRequest(request);
    if (!businessId || typeof body.conversationId !== "string" || typeof body.body !== "string" || !body.body.trim()) return NextResponse.json({ error: "businessId, conversationId, and body are required." }, { status: 400 });
    const authorized = await withOperatorTransaction(request, async ({ session, tx }) => {
      const [conversation] = await tx.select({ channel: conversations.channel }).from(conversations).where(and(eq(conversations.id, body.conversationId!), eq(conversations.businessId, businessId))).limit(1);
      if (!conversation) throw jsonError("Conversation not found in this workspace.", 404, "conversation_not_found");
      const channel = body.channel ?? "dashboard";
      if (!["dashboard", "sms", "web_chat"].includes(channel) || (channel !== "dashboard" && channel !== conversation.channel)) throw jsonError("The reply channel does not match this conversation.", 400, "message_channel_mismatch");
      if (channel === "sms") {
        const [sender] = await tx.select({ id: phoneNumbers.id }).from(phoneNumbers).where(and(eq(phoneNumbers.businessId, businessId), eq(phoneNumbers.status, "active"), eq(phoneNumbers.smsEnabled, true), isNull(phoneNumbers.reclaimScheduledAt))).limit(1);
        if (!sender) throw jsonError("This workspace has no active SMS-capable number. Voice-only numbers cannot send SMS.", 409, "sms_unavailable");
      }
      return { userId: session.user.id, channel };
    }, { minimumRole: "scheduler" });
    return NextResponse.json({ messageId: await appendMessage(createDomainContext(), { businessId, conversationId: body.conversationId, body: body.body.trim(), direction: "outbound", channel: authorized.channel, userId: authorized.userId }), }, { status: 201 });
  } catch (error) { return asApiResponse(error); }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request) as { conversationId?: string; automationState?: "ai_active" | "human_handoff" };
    const businessId = businessIdFromRequest(request);
    if (!businessId || !body.conversationId || (body.automationState !== "ai_active" && body.automationState !== "human_handoff")) return NextResponse.json({ error: "conversationId and a valid automationState are required." }, { status: 400 });
    const userId = await withOperatorTransaction(request, async ({ session, tx }) => {
      const [conversation] = await tx.select({ id: conversations.id }).from(conversations).where(and(eq(conversations.id, body.conversationId!), eq(conversations.businessId, businessId))).limit(1);
      if (!conversation) throw jsonError("Conversation not found in this workspace.", 404, "conversation_not_found");
      return session.user.id;
    }, { minimumRole: "scheduler" });
    await setAutomationState(createDomainContext(), { userId, businessId, conversationId: body.conversationId, state: body.automationState });
    return NextResponse.json({ ok: true });
  } catch (error) { return asApiResponse(error); }
}
