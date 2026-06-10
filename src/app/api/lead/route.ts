import { NextResponse } from "next/server";

/**
 * Lead intake — secondary conversion path (primary = Calendly).
 *
 * Delivery chain:
 *  1. LEAD_WEBHOOK_URL env var (e.g. n8n webhook) when configured.
 *  2. Fallback: FormSubmit relay to the agency inbox (zero-config,
 *     requires one-time activation email on first submission).
 * Every lead is also logged so Vercel function logs keep a trace.
 */

const INBOX = "contact.botflow@gmail.com";

type Lead = {
  name?: string;
  email?: string;
  establishment?: string;
  practitioners?: string;
  message?: string;
  company_website?: string; // honeypot
};

export async function POST(req: Request) {
  let body: Lead;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  // Honeypot filled → pretend success, drop silently.
  if (body.company_website) return NextResponse.json({ ok: true });

  const { name, email, establishment, practitioners, message } = body;
  if (!name || !email || !establishment || !practitioners || !message) {
    return NextResponse.json({ ok: false, error: "missing fields" }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }

  const lead = {
    name: String(name).slice(0, 200),
    email: String(email).slice(0, 200),
    establishment: String(establishment).slice(0, 200),
    practitioners: String(practitioners).slice(0, 50),
    message: String(message).slice(0, 3000),
    source: "landing-botflow-ia",
    receivedAt: new Date().toISOString(),
  };

  console.log("[lead]", JSON.stringify(lead));

  const webhook = process.env.LEAD_WEBHOOK_URL;
  try {
    if (webhook) {
      const res = await fetch(webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`webhook ${res.status}`);
    } else {
      const res = await fetch(`https://formsubmit.co/ajax/${INBOX}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          _subject: `Nouveau lead BotFlow IA — ${lead.establishment}`,
          ...lead,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`formsubmit ${res.status}`);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Lead is already in the function logs — surface the failure to the client
    // so the UI can show the direct-email fallback.
    console.error("[lead] delivery failed", err);
    return NextResponse.json({ ok: false, error: "delivery failed" }, { status: 502 });
  }
}
