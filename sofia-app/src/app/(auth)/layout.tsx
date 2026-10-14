import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { BrandPanel } from "@/components/auth/brand-panel";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
      <div className="flex min-h-dvh flex-col px-5 py-7 sm:px-10 lg:px-14">
        <header>
          <Link href="/login" className="inline-flex rounded-md focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none">
            <Logo withTagline />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px] animate-in duration-500 fade-in slide-in-from-bottom-2">{children}</div>
        </main>
        <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} BotFlow IA</span>
          <span aria-hidden>·</span>
          <span>SOFIA, l&apos;assistante des instituts et cliniques</span>
        </footer>
      </div>
      <BrandPanel />
    </div>
  );
}
