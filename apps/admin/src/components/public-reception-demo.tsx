"use client";

import { PhoneCall, ShieldCheck, Sparkles } from "lucide-react";

import { AuraVoiceDemo } from "@/components/web-voice/AuraVoiceDemo";

export function PublicReceptionDemo() {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-6xl flex-col px-6 py-10 lg:px-10">
        <header className="flex items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Caleonis <span className="font-medium text-muted-foreground">Reception</span>
          </a>
          <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Démonstration
          </span>
        </header>

        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[1.05fr_.95fr] lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1.5 text-sm">
              <Sparkles className="size-4" />
              Réceptionniste IA disponible 24h/24
            </div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Parlez à Caleonis Reception.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
              Testez directement la réceptionniste IA depuis votre navigateur. Elle peut répondre aux questions,
              qualifier une demande et prendre un message comme elle le ferait pour votre entreprise.
            </p>

            <div className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <PhoneCall className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Essayez une vraie demande</p>
                  <p className="mt-1 text-muted-foreground">Demandez les services, laissez un message ou simulez un prospect.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-4">
                <ShieldCheck className="mt-0.5 size-5 shrink-0" />
                <div>
                  <p className="font-medium">Vous parlez à une IA</p>
                  <p className="mt-1 text-muted-foreground">La démonstration l’indique clairement et ne remplace pas un service d’urgence.</p>
                </div>
              </div>
            </div>

            <p className="mt-8 text-sm text-muted-foreground">
              Exemples : « Que peut faire Caleonis Reception ? » · « Je voudrais laisser un message » ·
              « Comment pourriez-vous répondre aux appels de mon entreprise ? »
            </p>
          </div>

          <div className="mx-auto w-full max-w-[32rem]">
            <div className="rounded-3xl border bg-card p-6 shadow-sm sm:p-8">
              <p className="text-center text-sm font-medium">Cliquez sur le téléphone pour commencer</p>
              <p className="mt-1 text-center text-xs text-muted-foreground">Votre navigateur vous demandera l’accès au microphone.</p>
              <AuraVoiceDemo
                auraTone="light"
                businessSlug="caleonis-reception-public-demo"
                className="mt-4 w-full"
                widgetId="lobbystack-landing"
              />
            </div>
          </div>
        </section>

        <footer className="pb-2 text-center text-xs text-muted-foreground">
          Caleonis Reception · Démonstration vocale IA
        </footer>
      </div>
    </main>
  );
}
