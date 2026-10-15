"use client";

import { subscribeRealtimeQuery } from "@/lib/realtime-query";
import { selectActiveBusiness } from "@/lib/active-business";
import Link from "next/link";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, Bot, MessageSquare, SearchIcon, Send, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/locale";
import { useTelemetry } from "@/components/product-analytics";

type Business = { businessId: string; active: boolean; role: string };
type Message = { id: string; conversationId: string; contactName: string | null; contactPhone: string | null; visitorName: string | null; visitorEmail: string | null; channel: string | null; automationState: string | null; body: string; direction: string; status: string; createdAt: string };
type PhoneNumber = { status: string; voiceEnabled: boolean; smsEnabled: boolean; reclaimScheduledAt: string | null };
type Reply = { conversationId: string; body: string; channel: "sms" | "web_chat" };

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("Unable to load messages.");
  return await response.json() as T;
}

function initials(name: string | null, fallback: string): string {
  if (!name) return fallback.slice(0, 2).toUpperCase();
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("");
}

function conversationName(message: Message, t: (key: string) => string): string {
  return message.contactName ?? message.visitorName ?? message.contactPhone ?? message.visitorEmail ?? t("page.unknownCaller");
}

function conversationSubtitle(message: Message, t: (key: string) => string): string {
  if (message.channel === "web_chat") {
    return message.visitorEmail ?? message.contactName ?? message.visitorName ?? t("page.noChannel");
  }
  return message.contactPhone ?? message.contactName ?? t("page.noChannel");
}

export function LiveMessagesSurface() {
  const { t } = useTranslation("messages");
  const businesses = useQuery({ queryKey: ["businesses"], queryFn: () => getJson<{ businesses: Business[] }>("/api/businesses") });
  const business = selectActiveBusiness(businesses.data?.businesses);
  if (!business) {
    return <section className="flex flex-col gap-4"><PageHeader title={t("page.title")} /><p role={businesses.isError ? "alert" : "status"} className="text-sm text-muted-foreground">{t(businesses.isError ? "page.loadFailed" : businesses.isPending ? "page.loading" : "page.noWorkspace")}</p>{businesses.isError ? <Button className="self-start" onClick={() => void businesses.refetch()} variant="outline">{t("page.retry")}</Button> : null}</section>;
  }
  // A workspace switch clears the previous tenant's selected thread and draft.
  // The server continues to enforce membership, role, and SMS permissions.
  return <MessagesWorkspace businessId={business.businessId} canManageMessages={["scheduler", "business_admin", "business_owner", "platform_admin"].includes(business.role)} key={business.businessId} />;
}

function MessagesWorkspace({ businessId, canManageMessages }: { businessId: string; canManageMessages: boolean }) {
  const { i18n, t } = useTranslation("messages");
  const telemetry = useTelemetry();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectionRef = useRef({ conversationId: null as string | null, version: 0 });
  const [draft, setDraft] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "web_chat" | "sms">("all");
  const tenantQuery = `businessId=${encodeURIComponent(businessId)}`;
  const messages = useQuery({ queryKey: ["messages", businessId], queryFn: () => getJson<{ messages: Message[] }>(`/api/messages?${tenantQuery}`) });
  const numbers = useQuery({ queryKey: ["phone-numbers", businessId], queryFn: () => getJson<{ phoneNumbers: PhoneNumber[] }>(`/api/phone-numbers?${tenantQuery}`) });
  const activeNumbers = numbers.data?.phoneNumbers?.filter(number => number.status === "active" && !number.reclaimScheduledAt) ?? [];
  const canUseSms = numbers.isSuccess && activeNumbers.some(number => number.smsEnabled === true);
  const voiceOnly = !canUseSms && activeNumbers.some(number => number.voiceEnabled === true);
  const smsNotice = numbers.isError ? "page.smsUnavailable" : numbers.isPending ? "page.checkingSms" : voiceOnly ? "page.voiceOnlyDescription" : "page.noSmsNumber";
  const send = useMutation({
    mutationFn: async ({ reply }: { reply: Reply; selectionVersion: number }) => {
      if (reply.channel === "sms" && !canUseSms) throw new Error(t("page.smsUnavailable"));
      const response = await fetch(`/api/messages?${tenantQuery}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify(reply) });
      if (!response.ok) throw new Error(t("page.sendFailed"));
    },
    onSuccess: async (_, { reply, selectionVersion }) => {
      telemetry.track("web.messages.reply_sent", { businessId, conversationId: reply.conversationId, channel: reply.channel });
      if (selectionRef.current.conversationId === reply.conversationId && selectionRef.current.version === selectionVersion) setDraft("");
      await queryClient.invalidateQueries({ queryKey: ["messages", businessId] });
    },
  });
  const toggleAutomation = useMutation({
    mutationFn: async (state: "ai_active" | "human_handoff") => {
      if (!selectedId || !canManageMessages) return;
      const response = await fetch(`/api/messages?${tenantQuery}`, { method: "PATCH", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ conversationId: selectedId, automationState: state }) });
      if (!response.ok) throw new Error(t("page.automationUpdateFailed"));
    },
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["messages", businessId] }); },
  });

  useEffect(() => {
    return subscribeRealtimeQuery(queryClient, businessId, ["messages", businessId], ["message.upserted", "message.deliveryUpdated", "conversation.updated"]);
  }, [businessId, queryClient]);

  const conversations = useMemo(() => {
    const grouped = new Map<string, Message[]>();
    for (const message of messages.data?.messages ?? []) grouped.set(message.conversationId, [...(grouped.get(message.conversationId) ?? []), message]);
    return [...grouped.entries()].map(([id, items]) => {
      const sorted = items.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const latest = sorted.at(-1) ?? sorted[0]!;
      return { id, messages: sorted, latest, displayName: conversationName(latest, t), channel: latest.channel === "web_chat" ? "web_chat" as const : "sms" as const };
    })
      .filter((conversation) => (channelFilter === "all" || conversation.channel === channelFilter) && [conversation.latest.contactName, conversation.latest.visitorName, conversation.latest.contactPhone, conversation.latest.visitorEmail, conversation.latest.body].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  }, [messages.data, search, channelFilter, t]);
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const selectedAutomation = selected?.latest.automationState === "human_handoff" ? "human_handoff" : "ai_active";
  const canReply = Boolean(canManageMessages && selected && (selected.channel === "web_chat" || canUseSms));
  const replyUnavailable = canManageMessages ? smsNotice : "page.readOnly";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (selected && canReply && draft.trim() && !send.isPending) send.mutate({ reply: { conversationId: selected.id, body: draft.trim(), channel: selected.channel }, selectionVersion: selectionRef.current.version });
  }

  return (
    <section className="flex h-full min-w-0 gap-6" aria-label={t("page.title")}>
      <div className={cn("flex min-w-0 w-full flex-col gap-3 sm:w-56 lg:w-72 2xl:w-80", selected && "hidden sm:flex")}>
        <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-3 bg-background px-4 py-2 sm:static sm:z-auto sm:mx-0 sm:p-0">
          <PageHeader className="py-0" title={t("page.title")} />
          {!canUseSms ? <div className="rounded-xl border bg-muted/30 p-3 text-xs leading-relaxed" role="status"><p className="font-medium">{t(voiceOnly ? "page.voiceOnlyTitle" : "page.smsStatusTitle")}</p><p className="mt-1 text-muted-foreground">{t(smsNotice)}</p><Link className="mt-2 inline-block font-medium underline underline-offset-4" href="/settings/phone-number">{t("page.phoneSettings")}</Link></div> : null}
          <div className="flex items-center gap-1" aria-label={t("page.filterLabel")}>
            {(["all", "web_chat", "sms"] as const).map((key) => <Button key={key} aria-pressed={channelFilter === key} size="sm" type="button" variant={channelFilter === key ? "secondary" : "ghost"} className="px-2.5 text-xs" onClick={() => setChannelFilter(key)}>{key === "all" ? t("page.filterAll") : key === "web_chat" ? t("page.filterWeb") : t("page.filterSms")}</Button>)}
          </div>
          <div className="relative"><SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input aria-label={t("page.searchPlaceholder")} className="pl-10" onChange={(event) => setSearch(event.target.value)} placeholder={t("page.searchPlaceholder")} value={search} /></div>
        </div>
        <div className="-mx-3 no-scrollbar h-full overflow-y-auto p-3" aria-busy={messages.isPending}>
          {messages.isError ? <div role="alert" className="space-y-3 p-2 text-sm"><p>{t("page.loadFailed")}</p><Button onClick={() => void messages.refetch()} size="sm" variant="outline">{t("page.retry")}</Button></div> : messages.isPending ? <p role="status" className="p-2 text-sm text-muted-foreground">{t("page.loading")}</p> : conversations.length === 0 ? <div role="status" className="space-y-2 p-2 text-sm text-muted-foreground"><MessageSquare className="size-5" aria-hidden="true" /><p className="font-medium text-foreground">{t(search.trim() ? "page.noSearchResults" : "page.emptyTitle")}</p><p>{t(search.trim() ? "page.searchHint" : channelFilter === "sms" && !canUseSms ? smsNotice : "page.emptyDescription")}</p></div> : null}
          {conversations.map((conversation) => <div key={conversation.id}><button aria-pressed={selectedId === conversation.id} className={cn("group flex w-full rounded-md px-2 py-2 text-start text-sm hover:bg-accent hover:text-accent-foreground", selectedId === conversation.id && "bg-muted")} onClick={() => { telemetry.track("web.messages.thread_opened", { businessId, conversationId: conversation.id, channel: conversation.channel }); selectionRef.current = { conversationId: conversation.id, version: selectionRef.current.version + 1 }; setSelectedId(conversation.id); setDraft(""); send.reset(); toggleAutomation.reset(); }} type="button"><div className="flex w-full gap-2"><Avatar><AvatarFallback className="ph-mask">{initials(conversation.latest.visitorName ?? conversation.latest.contactName, conversation.displayName)}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2"><span className="ph-mask truncate font-semibold">{conversation.displayName}</span><span className="text-[11px] text-muted-foreground">{formatDateTime(conversation.latest.createdAt, i18n.language, { hour: "numeric", minute: "2-digit" })}</span></div><span className="ph-mask line-clamp-2 text-muted-foreground">{conversation.latest.body || t("page.emptyPreview")}</span></div>{conversation.channel === "web_chat" ? <span className="mt-0.5 flex size-4 items-center justify-center rounded-full bg-primary/10 text-primary" title={t("page.filterWeb")}><Bot className="size-3" /></span> : null}</div></button><Separator className="my-1" /></div>)}
        </div>
      </div>
      <div className={cn("hidden min-w-0 w-full flex-1 flex-col border bg-background sm:flex sm:rounded-md", selected && "flex")}>
        {selected ? <><div className="flex flex-wrap items-center gap-3 border-b p-4"><Button aria-label={t("page.backToConversations")} className="sm:hidden" onClick={() => { selectionRef.current = { conversationId: null, version: selectionRef.current.version + 1 }; setSelectedId(null); }} size="icon-sm" variant="ghost"><ArrowLeft /></Button><Avatar><AvatarFallback className="ph-mask">{initials(selected.latest.visitorName ?? selected.latest.contactName, selected.displayName)}</AvatarFallback></Avatar><div className="min-w-0"><p className="ph-mask truncate font-semibold">{selected.displayName}</p><p className="ph-mask truncate text-sm text-muted-foreground">{conversationSubtitle(selected.latest, t)}</p></div>{selected.channel === "web_chat" ? <div className="ml-auto flex flex-wrap items-center gap-2"><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", selectedAutomation === "ai_active" ? "bg-teal-50 text-teal-700" : "bg-amber-50 text-amber-700")}>{selectedAutomation === "ai_active" ? <Bot className="size-3.5" /> : <User className="size-3.5" />}{selectedAutomation === "ai_active" ? t("page.automationAiActive") : t("page.automationHumanHandoff")}</span><Button size="sm" variant="outline" onClick={() => toggleAutomation.mutate(selectedAutomation === "ai_active" ? "human_handoff" : "ai_active")} disabled={!canManageMessages || toggleAutomation.isPending}>{selectedAutomation === "ai_active" ? t("page.takeOver") : t("page.automationResumeAi")}</Button></div> : null}</div><div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">{selected.messages.map((message) => <div className={cn("flex", message.direction === "outbound" ? "justify-end" : "justify-start")} key={message.id}><div className={cn("max-w-[80%] rounded-2xl px-4 py-3 text-sm", message.direction === "outbound" ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted text-foreground")}><p className="ph-mask whitespace-pre-wrap break-words">{message.body}</p><p className="mt-1 text-[11px] opacity-70">{formatDateTime(message.createdAt, i18n.language, { hour: "numeric", minute: "2-digit" })}</p></div></div>)}</div>{toggleAutomation.isError ? <p role="alert" className="px-4 py-2 text-sm text-destructive">{t("page.automationUpdateFailed")}</p> : null}{!canReply ? <p id="message-reply-unavailable" role="status" className="border-t px-4 py-3 text-sm text-muted-foreground">{t(replyUnavailable)}</p> : null}{send.isError ? <p role="alert" className="px-4 py-2 text-sm text-destructive">{t("page.sendFailed")}</p> : null}<form className="flex gap-2 border-t p-4" onSubmit={submit}><Input aria-label={t("page.composerLabel")} aria-describedby={!canReply ? "message-reply-unavailable" : undefined} disabled={!canReply || send.isPending} className="h-11" onChange={(event) => setDraft(event.target.value)} placeholder={selected.channel === "web_chat" ? t("page.composerPlaceholderWeb") : t("page.composerPlaceholderSms")} value={draft} /><Button aria-label={t("page.send")} disabled={!canReply || !draft.trim() || send.isPending} loading={send.isPending} size="icon-lg" type="submit"><Send /></Button></form></> : <div className="m-auto p-8 text-center text-sm text-muted-foreground">{t("page.selectConversation")}</div>}
      </div>
    </section>
  );
}
