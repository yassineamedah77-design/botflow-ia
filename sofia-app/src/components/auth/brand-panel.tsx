import { CalendarCheckIcon, MessagesSquareIcon, TrendingUpIcon } from "lucide-react";

import { SofiaMark } from "@/components/brand/logo";

const PROMISES = [
  { icon: MessagesSquareIcon, text: "Répond à vos clientes 24 h/24 sur WhatsApp, Instagram et votre site." },
  { icon: CalendarCheckIcon, text: "Relance les prospects silencieux et réduit les rendez-vous manqués." },
  { icon: TrendingUpIcon, text: "Mesure le chiffre d'affaires récupéré, euro par euro." },
];

/** Right-hand panel of the auth pages: brand promise and an illustrative exchange. */
export function BrandPanel() {
  return (
    <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex">
      <div className="bg-paper-grain pointer-events-none absolute inset-0 opacity-[0.35] invert" aria-hidden />
      <div
        className="pointer-events-none absolute -top-40 -right-32 size-[520px] rounded-full bg-sofia/20 blur-[120px]"
        aria-hidden
      />
      <div className="relative flex w-full flex-col justify-between p-12 xl:p-16">
        <div className="max-w-md">
          <p className="text-xs font-semibold tracking-[0.2em] text-sofia uppercase">AI Revenue Recovery</p>
          <h2 className="mt-5 font-heading text-[2.15rem] leading-[1.15] font-semibold tracking-tight text-balance">
            Chaque conversation peut devenir un rendez-vous.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-primary-foreground/65">
            SOFIA transforme les messages de vos clientes en réservations, et vous montre ce qu&apos;elle vous fait récupérer.
          </p>
        </div>

        <figure className="my-10 max-w-md" aria-label="Exemple de conversation avec SOFIA">
          <figcaption className="mb-3 text-[0.6875rem] font-medium tracking-wide text-primary-foreground/45 uppercase">
            Exemple de conversation
          </figcaption>
          <div className="space-y-2.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
            <Bubble from="client">Bonjour, combien coûte un Hydrafacial ?</Bubble>
            <Bubble from="sofia">
              L&apos;Hydrafacial Signature est à 180 € pour 60 minutes. Voulez-vous que je vous propose un créneau cette
              semaine ?
            </Bubble>
            <Bubble from="client">Oui, jeudi en fin de journée ?</Bubble>
            <Bubble from="sofia">Jeudi 18 h 30 est disponible. Je vous le réserve ?</Bubble>
            <div className="flex justify-end pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sofia/15 px-2.5 py-1 text-[0.6875rem] font-medium text-sofia">
                <span className="size-1.5 rounded-full bg-sofia" aria-hidden />
                Rendez-vous confirmé · 180 €
              </span>
            </div>
          </div>
        </figure>

        <ul className="grid max-w-md gap-3.5">
          {PROMISES.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-relaxed text-primary-foreground/75">
              <Icon className="mt-0.5 size-4 shrink-0 text-sofia" aria-hidden />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

function Bubble({ from, children }: { from: "client" | "sofia"; children: React.ReactNode }) {
  if (from === "client") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[80%] rounded-2xl rounded-br-md bg-white/10 px-3.5 py-2 text-[0.8125rem] leading-relaxed text-primary-foreground/90">
          {children}
        </p>
      </div>
    );
  }
  return (
    <div className="flex items-end gap-2">
      <SofiaMark className="size-6 text-[0.625rem]" />
      <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-primary-foreground px-3.5 py-2 text-[0.8125rem] leading-relaxed text-primary">
        {children}
      </p>
    </div>
  );
}
