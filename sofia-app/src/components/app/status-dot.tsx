import { cn } from "cn";

import type { ChannelStatus } from "./navigation";

const STATUS_STYLES: Record<ChannelStatus, { dot: string; label: string }> = {
  CONNECTED: { dot: "bg-success", label: "Connecté" },
  PENDING: { dot: "bg-warning", label: "Connexion en cours" },
  ERROR: { dot: "bg-destructive", label: "Erreur de connexion" },
  DISCONNECTED: { dot: "bg-destructive/60", label: "Déconnecté" },
  NOT_CONNECTED: { dot: "bg-sand-strong/70", label: "Non connecté" },
};

export function channelStatusLabel(status: ChannelStatus) {
  return STATUS_STYLES[status].label;
}

export function StatusDot({ status, className }: { status: ChannelStatus; className?: string }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={cn("relative inline-flex size-2 shrink-0", className)} title={style.label}>
      <span className={cn("size-2 rounded-full", style.dot)} />
      <span className="sr-only">{style.label}</span>
    </span>
  );
}
