import {
  BarChart3Icon,
  BookOpenIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  GlobeIcon,
  InboxIcon,
  LayoutDashboardIcon,
  RefreshCcwIcon,
  Settings2Icon,
  UsersIcon,
  UsersRoundIcon,
  WorkflowIcon,
} from "lucide-react";
import type * as React from "react";

import { InstagramIcon, WhatsAppIcon } from "@/components/brand/channel-icons";
import type { Permission } from "@/lib/auth/roles";

type IconComponent = React.ComponentType<{ className?: string }>;

/**
 * Sidebar structure from the specification (§17). `phase` marks modules not
 * built yet: they stay visible with a "Bientôt" tag and open an honest page
 * describing what is coming — never a fake interface.
 */

export type ChannelKey = "whatsapp" | "instagram" | "website";

export interface NavItem {
  label: string;
  href: string;
  icon: IconComponent;
  /** Delivery phase when the module is not available yet. */
  phase?: number;
  permission?: Permission;
  channel?: ChannelKey;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAVIGATION: NavSection[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboardIcon },
      { label: "Inbox", href: "/inbox", icon: InboxIcon, phase: 2 },
      { label: "Leads", href: "/leads", icon: UsersRoundIcon, phase: 2 },
      { label: "Rendez-vous", href: "/appointments", icon: CalendarDaysIcon, phase: 7 },
      { label: "Automatisations", href: "/automations", icon: WorkflowIcon, phase: 8 },
      { label: "Réactivation", href: "/reactivation", icon: RefreshCcwIcon, phase: 8 },
      { label: "Knowledge Base", href: "/knowledge", icon: BookOpenIcon },
      { label: "Analytics", href: "/analytics", icon: BarChart3Icon, phase: 9 },
    ],
  },
  {
    title: "Canaux",
    items: [
      { label: "WhatsApp", href: "/channels/whatsapp", icon: WhatsAppIcon, channel: "whatsapp" },
      { label: "Instagram", href: "/channels/instagram", icon: InstagramIcon, channel: "instagram" },
      { label: "Website", href: "/channels/website", icon: GlobeIcon, channel: "website" },
    ],
  },
  {
    items: [
      { label: "Paramètres", href: "/settings", icon: Settings2Icon },
      { label: "Équipe", href: "/team", icon: UsersIcon },
      { label: "Facturation", href: "/billing", icon: CreditCardIcon, permission: "billing:read" },
    ],
  },
];

export type ChannelStatus = "NOT_CONNECTED" | "PENDING" | "CONNECTED" | "ERROR" | "DISCONNECTED";
