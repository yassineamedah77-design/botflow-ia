"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

import { NotificationBell, useShellFeed } from "./notification-bell";
import { SidebarContent, type ShellActions, type ShellData } from "./sidebar";

/**
 * Application frame: fixed sidebar on desktop, drawer on tablet and mobile.
 */
export function AppShell({
  data,
  actions,
  banner,
  children,
}: {
  data: ShellData;
  actions: ShellActions;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // One feed for both bells (sidebar on desktop, header on mobile): a single poll.
  const { feed, refresh, read } = useShellFeed(data.feed, actions.markNotificationsRead);
  const bell = (align: "start" | "end") => <NotificationBell feed={feed} onOpen={() => void refresh()} onRead={read} align={align} />;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent data={data} actions={actions} inboxUnread={feed.inboxUnread} bell={bell("start")} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
          <Link href="/dashboard" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Logo size="sm" />
          </Link>
          <div className="flex items-center gap-1">
            {bell("end")}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[18rem] max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <SheetDescription className="sr-only">Accès aux modules de SOFIA</SheetDescription>
                <SidebarContent data={data} actions={actions} inboxUnread={feed.inboxUnread} onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {banner}

        {/* A page rendering [data-fullbleed] (the inbox) takes the whole area, without padding or max width. */}
        <main id="main" className="flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-10 has-[[data-fullbleed]]:p-0">
          <div className="mx-auto w-full max-w-6xl animate-in duration-300 fade-in has-[[data-fullbleed]]:max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
}
