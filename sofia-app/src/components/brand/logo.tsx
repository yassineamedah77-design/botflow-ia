import { cn } from "cn";

/**
 * SOFIA wordmark. The orange dot is the only place the brand orange appears
 * at rest; elsewhere it marks AI activity.
 */
export function Logo({
  className,
  size = "md",
  tone = "ink",
  withTagline = false,
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: "ink" | "paper";
  withTagline?: boolean;
}) {
  const text = { sm: "text-[0.9375rem]", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span
        className={cn(
          "font-heading font-bold tracking-[0.16em]",
          text,
          tone === "ink" ? "text-foreground" : "text-background",
        )}
      >
        SOFIA<span className="text-sofia">.</span>
      </span>
      {withTagline ? (
        <span
          className={cn(
            "mt-1.5 text-[0.6875rem] font-medium tracking-wide",
            tone === "ink" ? "text-muted-foreground" : "text-background/60",
          )}
        >
          by BotFlow IA
        </span>
      ) : null}
    </span>
  );
}

/** Round avatar standing for SOFIA in conversations and status chips. */
export function SofiaMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-sofia text-[0.75rem] font-semibold text-sofia-foreground shadow-xs",
        className,
      )}
    >
      S
    </span>
  );
}
