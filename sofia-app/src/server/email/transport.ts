import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import nodemailer from "nodemailer";

import { env } from "@/server/env";
import { logger } from "@/server/observability/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Template name, for logs and provider analytics. */
  template: string;
}

export interface EmailTransport {
  readonly name: string;
  send(message: EmailMessage & { from: string }): Promise<{ messageId?: string }>;
}

class SmtpTransport implements EmailTransport {
  readonly name = "smtp";
  private readonly transporter;

  constructor(url: string) {
    this.transporter = nodemailer.createTransport(url);
  }

  async send(message: EmailMessage & { from: string }) {
    const info = await this.transporter.sendMail({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      headers: { "X-Sofia-Template": message.template },
    });
    return { messageId: info.messageId };
  }
}

/** Development: prints the email (including links) to the server output. */
class ConsoleTransport implements EmailTransport {
  readonly name = "console";

  async send(message: EmailMessage & { from: string }) {
    // Written to stdout directly (not through the logger) so links stay readable.
    console.log(
      [
        "──────── email (console transport) ────────",
        `To:       ${message.to}`,
        `Subject:  ${message.subject}`,
        `Template: ${message.template}`,
        "",
        message.text,
        "───────────────────────────────────────────",
      ].join("\n"),
    );
    return {};
  }
}

/** Development and end-to-end tests: one JSON file per email. */
class FileTransport implements EmailTransport {
  readonly name = "file";

  constructor(private readonly directory: string) {}

  async send(message: EmailMessage & { from: string }) {
    await mkdir(this.directory, { recursive: true });
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await writeFile(path.join(this.directory, `${id}.json`), JSON.stringify({ id, sentAt: new Date().toISOString(), ...message }, null, 2));
    return { messageId: id };
  }
}

/** Unit and integration tests: keeps emails in memory. */
export class MemoryTransport implements EmailTransport {
  readonly name = "memory";
  readonly sent: Array<EmailMessage & { from: string }> = [];
  failNext = false;

  async send(message: EmailMessage & { from: string }) {
    if (this.failNext) {
      this.failNext = false;
      throw new Error("Simulated email delivery failure");
    }
    this.sent.push(message);
    return { messageId: `memory-${this.sent.length}` };
  }

  last() {
    return this.sent.at(-1);
  }
}

let override: EmailTransport | undefined;
let configured: EmailTransport | undefined;

export function setEmailTransportForTesting(transport: EmailTransport | undefined) {
  override = transport;
}

export function getEmailTransport(): EmailTransport {
  if (override) return override;
  if (!configured) {
    const config = env();
    switch (config.EMAIL_TRANSPORT) {
      case "smtp":
        configured = new SmtpTransport(config.SMTP_URL!);
        break;
      case "file":
        configured = new FileTransport(path.resolve(config.EMAIL_OUTBOX_DIR));
        break;
      case "console":
        configured = new ConsoleTransport();
        break;
    }
    logger.info("Email transport ready", { transport: configured.name });
  }
  return configured;
}
