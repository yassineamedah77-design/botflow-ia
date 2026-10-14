import { ArrowLeftIcon, FlaskConicalIcon, InboxIcon, PlugIcon, TriangleAlertIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";

import { Composer, ContactSheet, HandoffButton, InboxAutoRefresh, MarkConversationRead, ThreadScroller } from "@/components/inbox/inbox-client";
import { ContactPanel, ConversationList, MessageList } from "@/components/inbox/inbox-parts";
import { ChannelIcon, LeadAvatar } from "@/components/leads/lead-bits";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHANNEL_LABELS } from "@/lib/crm";
import { inboxQuery, parseInboxFilters } from "@/lib/inbox-filters";
import { requireTenant } from "@/server/auth/dal";
import { channelAvailabilityPhase } from "@/server/channels";
import { withTenant } from "@/server/db/context";
import { getConversationThread, getInboxCounters, listConversations } from "@/server/services/inbox";
import { listAssignableMembers } from "@/server/services/leads";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage(props: PageProps<"/inbox">) {
  const ctx = await requireTenant();
  const filters = parseInboxFilters(await props.searchParams);
  const now = new Date();
  const organizationId = ctx.organization.id;
  const timeZone = ctx.organization.timezone;

  const data = await withTenant(organizationId, async (tx) => ({
    list: await listConversations(tx, organizationId, filters, { userId: ctx.user.id, now }),
    counters: await getInboxCounters(tx, organizationId),
    thread: filters.conversation ? await getConversationThread(tx, organizationId, filters.conversation, { now }) : null,
    members: await listAssignableMembers(tx, organizationId),
  }));
  const { thread } = data;

  if (data.counters.total === 0) {
    return (
      <div className="mx-auto grid max-w-xl gap-5 px-4 py-16 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-sand">
          <InboxIcon className="size-6 text-foreground/70" aria-hidden />
        </span>
        <h1 className="text-2xl font-semibold">Aucune conversation pour l&apos;instant</h1>
        <p className="text-muted-foreground">
          Les messages WhatsApp, Instagram et du widget de votre site arriveront ici dès qu&apos;un canal sera connecté. SOFIA y répond, et vous
          pouvez prendre la main à tout moment.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/channels/whatsapp">
              <PlugIcon aria-hidden />
              Voir les canaux
            </Link>
          </Button>
          {ctx.can("leads:import") ? (
            <Button asChild>
              <Link href="/leads/import">Importer votre fichier clients</Link>
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const canTakeOver = ctx.can("conversations:takeover");
  const replyBlocked = (() => {
    if (!thread) return null;
    if (thread.conversation.handlingMode !== "HUMAN_ACTIVE") return "SOFIA répond à cette conversation. Prenez-la pour répondre vous-même.";
    if (!thread.whatsappWindowOpen) {
      return "La dernière réponse de la cliente date de plus de 24 h : WhatsApp n'autorise alors que les modèles de messages approuvés par Meta (phase 5).";
    }
    if (!ctx.organization.isDemo) {
      return `Pour répondre depuis SOFIA, ${CHANNEL_LABELS[thread.conversation.channel]} doit être connecté (phase ${channelAvailabilityPhase(thread.conversation.channel)}).`;
    }
    return null;
  })();

  const panel = thread ? (
    <ContactPanel
      thread={thread}
      now={now}
      timeZone={timeZone}
      currency={ctx.organization.currency}
      canWrite={ctx.can("leads:write")}
      members={data.members}
      currentUserId={ctx.user.id}
      canDeleteNotes={ctx.can("leads:delete")}
    />
  ) : null;

  return (
    <div data-fullbleed className="flex h-[calc(100dvh-3.5rem)] min-h-0 lg:h-dvh">
      <InboxAutoRefresh />
      <aside
        className={cn("w-full shrink-0 border-r border-border bg-card/40 lg:block lg:w-[22rem]", thread ? "hidden" : "block")}
        aria-label="Liste des conversations"
      >
        <ConversationList items={data.list.items} hasMore={data.list.hasMore} filters={filters} counters={data.counters} now={now} />
      </aside>

      <section className={cn("min-w-0 flex-1 flex-col", thread ? "flex" : "hidden lg:flex")} aria-label="Conversation">
        {thread ? (
          <>
            <MarkConversationRead conversationId={thread.conversation.id} unread={thread.conversation.unreadCount} />
            <header className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-5">
              <Button variant="ghost" size="icon" className="-ml-2 lg:hidden" asChild>
                <Link href={inboxQuery(filters, { conversation: null })} aria-label="Retour aux conversations">
                  <ArrowLeftIcon aria-hidden />
                </Link>
              </Button>
              <LeadAvatar name={thread.lead.name} seed={thread.lead.id} />
              <div className="min-w-0 flex-1">
                <Link href={`/leads/${thread.lead.id}`} className="block truncate font-semibold hover:underline">
                  {thread.lead.name}
                </Link>
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ChannelIcon channel={thread.conversation.channel} withLabel />
                  <span aria-hidden>·</span>
                  {thread.conversation.handlingMode === "HUMAN_ACTIVE" ? (
                    <span>Pris par {thread.takenOverByName ?? "l'équipe"}</span>
                  ) : (
                    <span>SOFIA répond</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <HandoffButton conversationId={thread.conversation.id} mode={thread.conversation.handlingMode} canTakeOver={canTakeOver} />
                {panel ? <ContactSheet>{panel}</ContactSheet> : null}
              </div>
            </header>
            {thread.conversation.humanRequestedAt && thread.conversation.handlingMode === "AI_ACTIVE" ? (
              <div className="flex items-start gap-2 border-b border-destructive/20 bg-danger-soft px-5 py-2.5 text-sm text-destructive">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
                SOFIA a demandé l&apos;aide de l&apos;équipe sur cette conversation{thread.conversation.intent === "MEDICAL_QUESTION" ? " (question médicale)" : ""}.
              </div>
            ) : null}
            {ctx.organization.isDemo ? (
              <div className="flex items-center gap-2 border-b border-border bg-info-soft/60 px-5 py-2 text-xs text-info">
                <FlaskConicalIcon className="size-3.5 shrink-0" aria-hidden />
                Établissement de démonstration : contacts fictifs, aucun message n&apos;est réellement envoyé.
              </div>
            ) : null}
            <ThreadScroller messageCount={thread.messages.length} className="min-h-0 flex-1 overflow-y-auto bg-background outline-none">
              {thread.hasOlder ? (
                <p className="pt-4 text-center text-xs text-muted-foreground">Seuls les 60 derniers messages sont affichés.</p>
              ) : null}
              <MessageList thread={thread} now={now} timeZone={timeZone} />
            </ThreadScroller>
            {ctx.can("conversations:reply") ? <Composer conversationId={thread.conversation.id} disabledReason={replyBlocked} /> : null}
          </>
        ) : (
          <div className="m-auto grid max-w-sm gap-2 px-6 text-center">
            <p className="font-medium">Sélectionnez une conversation</p>
            <p className="text-sm text-muted-foreground">
              {data.counters.human > 0 ? (
                <>
                  <Badge variant="destructive" className="mr-1">
                    {data.counters.human}
                  </Badge>
                  conversation{data.counters.human > 1 ? "s attendent" : " attend"} une personne de l&apos;équipe.
                </>
              ) : (
                "SOFIA traite les conversations ; vous pouvez prendre la main à tout moment."
              )}
            </p>
          </div>
        )}
      </section>

      {panel ? (
        <aside className="hidden w-[20rem] shrink-0 overflow-y-auto border-l border-border bg-card/40 xl:block" aria-label="Fiche du contact">
          {panel}
        </aside>
      ) : null}
    </div>
  );
}
