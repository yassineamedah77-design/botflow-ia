"use client";

import { cn } from "cn";
import { CheckIcon, ChevronsUpDownIcon, LogOutIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";

import { Logo } from "@/components/brand/logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type Permission, type Role } from "@/lib/auth/roles";
import { initials } from "@/lib/format";

import { NAVIGATION, type ChannelKey, type ChannelStatus, type NavItem } from "./navigation";
import { StatusDot } from "./status-dot";

export interface ShellData {
  user: { name: string; email: string };
  role: Role;
  permissions: Permission[];
  organization: { id: string; name: string; sofiaStatus: "INACTIVE" | "ACTIVE" | "PAUSED" };
  organizations: Array<{ id: string; name: string; role: Role }>;
  channels: Record<ChannelKey, ChannelStatus>;
}

export interface ShellActions {
  switchOrganization: (organizationId: string) => Promise<void>;
  signOut: () => Promise<void>;
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, active, channelStatus, onNavigate }: { item: NavItem; active: boolean; channelStatus?: ChannelStatus; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-9 items-center gap-3 rounded-lg px-2.5 text-[0.875rem] font-medium text-foreground/68 transition-[background-color,color,box-shadow] duration-150 outline-none hover:bg-sidebar-accent/70 hover:text-foreground focus-visible:ring-3 focus-visible:ring-sidebar-ring/40",
        active && "bg-sidebar-accent text-foreground shadow-xs ring-1 ring-sidebar-border",
      )}
    >
      <Icon className={cn("size-[1.0625rem] shrink-0 transition-colors", active ? "text-foreground" : "text-foreground/55 group-hover:text-foreground/80")} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.phase ? (
        <span className="rounded-full bg-sand px-1.5 py-0.5 text-[0.6875rem] leading-none font-medium text-muted-foreground">
          Bientôt
        </span>
      ) : null}
      {channelStatus ? <StatusDot status={channelStatus} /> : null}
    </Link>
  );
}

function OrganizationSwitcher({ data, actions }: { data: ShellData; actions: ShellActions }) {
  const [pending, startTransition] = useTransition();
  const others = data.organizations.filter((organization) => organization.id !== data.organization.id);

  const trigger = (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span className="truncate text-[0.875rem] font-semibold text-foreground">{data.organization.name}</span>
      <span className="truncate text-xs text-muted-foreground">{ROLE_LABELS[data.role]}</span>
    </span>
  );

  if (others.length === 0) {
    return <div className="flex items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5">{trigger}</div>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex w-full items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 py-2.5 transition-colors outline-none hover:bg-sidebar-accent focus-visible:ring-3 focus-visible:ring-sidebar-ring/40"
      >
        {trigger}
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuLabel>Établissements</DropdownMenuLabel>
        <DropdownMenuGroup>
          {data.organizations.map((organization) => (
            <DropdownMenuItem
              key={organization.id}
              onSelect={() => {
                if (organization.id === data.organization.id) return;
                startTransition(() => actions.switchOrganization(organization.id));
              }}
            >
              <span className="flex-1 truncate">{organization.name}</span>
              {organization.id === data.organization.id ? <CheckIcon className="size-4" aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const SOFIA_STATUS = {
  ACTIVE: { label: "SOFIA est active", detail: "Elle répond 24 h/24", dot: "bg-sofia", pulse: true },
  PAUSED: { label: "SOFIA est en pause", detail: "Les réponses automatiques sont suspendues", dot: "bg-warning", pulse: false },
  INACTIVE: { label: "SOFIA n'est pas activée", detail: "Configuration en cours", dot: "bg-sand-strong", pulse: false },
} as const;

function SofiaStatus({ status }: { status: ShellData["organization"]["sofiaStatus"] }) {
  const copy = SOFIA_STATUS[status];
  return (
    <div className="flex items-center gap-2.5 rounded-xl px-3 py-2">
      <span className="relative flex size-2.5 shrink-0">
        {copy.pulse ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-sofia/60" /> : null}
        <span className={cn("relative inline-flex size-2.5 rounded-full", copy.dot)} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.8125rem] font-medium text-foreground">{copy.label}</span>
        <span className="block truncate text-xs text-muted-foreground">{copy.detail}</span>
      </span>
    </div>
  );
}

function UserMenu({ data, actions }: { data: ShellData; actions: ShellActions }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors outline-none hover:bg-sidebar-accent/70 focus-visible:ring-3 focus-visible:ring-sidebar-ring/40"
        aria-label="Menu du compte"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(data.user.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.8125rem] font-medium text-foreground">{data.user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{data.user.email}</span>
        </span>
        <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
        <DropdownMenuItem asChild>
          <Link href="/settings/account">
            <UserRoundIcon aria-hidden />
            Mon compte
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={() => startTransition(() => actions.signOut())}>
          <LogOutIcon aria-hidden />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SidebarContent({ data, actions, onNavigate }: { data: ShellData; actions: ShellActions; onNavigate?: () => void }) {
  const pathname = usePathname();
  const permissions = new Set(data.permissions);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-4 px-4 pt-6 pb-4">
        <Link href="/dashboard" onClick={onNavigate} className="inline-flex rounded-md px-1 outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring/40">
          <Logo />
        </Link>
        <OrganizationSwitcher data={data} actions={actions} />
      </div>
      <nav aria-label="Navigation principale" className="flex-1 space-y-6 overflow-y-auto px-3 pb-6">
        {NAVIGATION.map((section, index) => {
          const items = section.items.filter((item) => !item.permission || permissions.has(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={section.title ?? index} className="space-y-1">
              {section.title ? (
                <p className="px-2.5 pb-1 text-[0.6875rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{section.title}</p>
              ) : index > 0 ? (
                <div className="mx-2.5 mb-3 border-t border-sidebar-border" aria-hidden />
              ) : null}
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                  channelStatus={item.channel ? data.channels[item.channel] : undefined}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <SofiaStatus status={data.organization.sofiaStatus} />
        <UserMenu data={data} actions={actions} />
      </div>
    </div>
  );
}
