"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type * as React from "react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent data={data} actions={actions} />
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur-md lg:hidden">
          <Link href="/dashboard" className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/40">
            <Logo size="sm" />
          </Link>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Ouvrir le menu">
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[18rem] max-w-[85vw] gap-0 border-sidebar-border bg-sidebar p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Accès aux modules de SOFIA</SheetDescription>
              <SidebarContent data={data} actions={actions} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
        </header>

        {banner}

        <main id="main" className="flex-1 px-4 py-6 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto w-full max-w-6xl animate-in duration-300 fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
