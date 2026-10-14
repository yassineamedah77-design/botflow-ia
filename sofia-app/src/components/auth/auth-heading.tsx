import type * as React from "react";

export function AuthHeading({ title, description }: { title: string; description?: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-[1.75rem] leading-tight font-semibold">{title}</h1>
      {description ? <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted-foreground">{description}</p> : null}
    </div>
  );
}
