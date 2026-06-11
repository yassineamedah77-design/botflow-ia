"use client";

import { useState } from "react";
import { useCopy } from "./lang";
import { CalendlyInline } from "./calendly";
import { Reveal } from "./reveal";

export function FinalCta() {
  const copy = useCopy();
  return (
    <section id="audit" aria-labelledby="audit-title" className="relative scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <p className="mb-4 flex items-center justify-center gap-3 text-center text-[12px] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
            {copy.finalCta.eyebrow}
          </p>
          <h2
            id="audit-title"
            className="mx-auto max-w-3xl text-balance text-center text-[clamp(28px,5.5vw,50px)] font-semibold leading-[1.1] tracking-[-0.02em]"
          >
            {copy.finalCta.title}{" "}
            <span className="font-serif-italic text-[var(--accent)]">{copy.finalCta.titleAccent}</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[15.5px] leading-relaxed text-[#aab3a9]">
            {copy.finalCta.sub}
          </p>
        </Reveal>

        {/* Inline Calendly — booking without an extra click */}
        <Reveal delay={120}>
          <div className="mt-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0b0d0a]">
            <CalendlyInline className="w-full" />
          </div>
        </Reveal>

        {/* Secondary path: lead form */}
        <Reveal delay={140}>
          <div className="mx-auto mt-14 max-w-2xl rounded-3xl border border-white/[0.07] bg-white/[0.02] p-7 sm:p-10">
            <h3 className="text-[20px] font-semibold">{copy.finalCta.formTitle}</h3>
            <p className="mt-1.5 text-[13.5px] text-[var(--fg-muted)]">{copy.finalCta.formSub}</p>
            <LeadForm />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-[#0b0d0a] px-4 py-3 text-[14.5px] text-[var(--fg)] placeholder:text-[#5f675f] outline-none transition focus:border-[var(--accent)]/60 focus:ring-2 focus:ring-[var(--accent)]/20";

function LeadForm() {
  const copy = useCopy();
  const [status, setStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const f = copy.form;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("ok");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "ok") {
    return (
      <p
        role="status"
        className="mt-6 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-5 py-4 text-[14.5px] text-[#d8f5c5]"
      >
        ✓ {f.success}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 grid gap-5 sm:grid-cols-2">
      {/* Honeypot — bots fill it, humans never see it */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div>
        <label htmlFor="lead-name" className="mb-1.5 block text-[13px] font-medium text-[#cfd6cd]">
          {f.name} <span className="text-[var(--accent)]">*</span>
        </label>
        <input id="lead-name" name="name" required placeholder={f.namePh} className={inputCls} />
      </div>
      <div>
        <label htmlFor="lead-email" className="mb-1.5 block text-[13px] font-medium text-[#cfd6cd]">
          {f.email} <span className="text-[var(--accent)]">*</span>
        </label>
        <input
          id="lead-email"
          name="email"
          type="email"
          required
          placeholder={f.emailPh}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor="lead-type" className="mb-1.5 block text-[13px] font-medium text-[#cfd6cd]">
          {f.establishment} <span className="text-[var(--accent)]">*</span>
        </label>
        <select id="lead-type" name="establishment" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            {copy.ui.select}
          </option>
          {f.establishmentOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="lead-size" className="mb-1.5 block text-[13px] font-medium text-[#cfd6cd]">
          {f.practitioners} <span className="text-[var(--accent)]">*</span>
        </label>
        <select id="lead-size" name="practitioners" required defaultValue="" className={inputCls}>
          <option value="" disabled>
            {copy.ui.select}
          </option>
          {f.practitionersOptions.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="lead-msg" className="mb-1.5 block text-[13px] font-medium text-[#cfd6cd]">
          {f.message} <span className="text-[var(--accent)]">*</span>
        </label>
        <textarea
          id="lead-msg"
          name="message"
          required
          rows={4}
          placeholder={f.messagePh}
          className={inputCls}
        />
      </div>
      {status === "error" && (
        <p role="alert" className="text-[13.5px] text-red-300 sm:col-span-2">
          {f.error}
        </p>
      )}
      <button
        type="submit"
        disabled={status === "sending"}
        className="cursor-pointer rounded-xl bg-[var(--accent)] px-7 py-3.5 text-[14.5px] font-bold text-[#062013] transition hover:brightness-105 active:scale-[.98] disabled:opacity-60 sm:col-span-2 sm:justify-self-start"
      >
        {status === "sending" ? copy.ui.sending : f.submit} →
      </button>
    </form>
  );
}
