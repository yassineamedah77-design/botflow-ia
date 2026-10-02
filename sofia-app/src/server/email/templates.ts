import "server-only";

/**
 * Transactional email templates (French). Every value coming from a user —
 * names, establishment names — is HTML-escaped: an establishment called
 * `<a href=…>` must not inject markup into someone else's inbox.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
  template: string;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const COLORS = {
  background: "#FAF8F5",
  card: "#FFFFFF",
  ink: "#141413",
  muted: "#6F6A62",
  border: "#E8E1D6",
  accent: "#D97757",
};

interface LayoutOptions {
  preheader: string;
  heading: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footnote?: string;
}

function layout({ preheader, heading, paragraphs, action, footnote }: LayoutOptions) {
  const body = paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COLORS.ink};">${paragraph}</p>`)
    .join("");
  const button = action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:${COLORS.ink};">
        <a href="${escapeHtml(action.url)}" style="display:inline-block;padding:13px 22px;font-size:15px;font-weight:600;color:${COLORS.background};text-decoration:none;border-radius:10px;">${escapeHtml(action.label)}</a>
      </td></tr></table>
      <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:${COLORS.muted};">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br><span style="word-break:break-all;color:${COLORS.ink};">${escapeHtml(action.url)}</span></p>`
    : "";
  const note = footnote
    ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid ${COLORS.border};font-size:13px;line-height:1.5;color:${COLORS.muted};">${footnote}</p>`
    : "";

  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,Arial,sans-serif;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${COLORS.background};padding:40px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
      <tr><td style="padding:0 4px 20px;font-size:15px;font-weight:700;letter-spacing:0.08em;color:${COLORS.ink};">
        SOFIA<span style="color:${COLORS.accent};">.</span>
      </td></tr>
      <tr><td style="background:${COLORS.card};border:1px solid ${COLORS.border};border-radius:16px;padding:32px 28px;">
        <h1 style="margin:0 0 20px;font-size:21px;line-height:1.3;font-weight:600;color:${COLORS.ink};">${escapeHtml(heading)}</h1>
        ${body}${button}${note}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.5;color:${COLORS.muted};">
        SOFIA by BotFlow IA · Email automatique, merci de ne pas y répondre.
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

function text(lines: Array<string | undefined>) {
  return lines.filter((line) => line !== undefined).join("\n");
}

export function passwordResetEmail(input: { name: string; url: string; expiresInMinutes: number }): RenderedEmail {
  const name = escapeHtml(input.name);
  return {
    template: "password_reset",
    subject: "Réinitialisez votre mot de passe SOFIA",
    html: layout({
      preheader: "Lien de réinitialisation valable une heure.",
      heading: "Réinitialisation du mot de passe",
      paragraphs: [
        `Bonjour ${name},`,
        `Vous avez demandé à réinitialiser le mot de passe de votre compte SOFIA. Ce lien est valable ${input.expiresInMinutes} minutes et ne peut servir qu'une seule fois.`,
      ],
      action: { label: "Choisir un nouveau mot de passe", url: input.url },
      footnote:
        "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email : votre mot de passe reste inchangé.",
    }),
    text: text([
      `Bonjour ${input.name},`,
      "",
      `Vous avez demandé à réinitialiser le mot de passe de votre compte SOFIA. Ce lien est valable ${input.expiresInMinutes} minutes et ne peut servir qu'une seule fois :`,
      input.url,
      "",
      "Vous n'êtes pas à l'origine de cette demande ? Ignorez cet email : votre mot de passe reste inchangé.",
    ]),
  };
}

export function emailVerificationEmail(input: { name: string; url: string; expiresInHours: number }): RenderedEmail {
  const name = escapeHtml(input.name);
  return {
    template: "email_verification",
    subject: "Confirmez votre adresse email",
    html: layout({
      preheader: "Une dernière étape pour sécuriser votre compte.",
      heading: "Confirmez votre adresse email",
      paragraphs: [
        `Bonjour ${name},`,
        "Confirmez votre adresse pour sécuriser votre compte SOFIA et recevoir les alertes importantes de votre établissement.",
      ],
      action: { label: "Confirmer mon adresse", url: input.url },
      footnote: `Ce lien est valable ${input.expiresInHours} heures. Si vous n'avez pas créé de compte SOFIA, ignorez cet email.`,
    }),
    text: text([
      `Bonjour ${input.name},`,
      "",
      "Confirmez votre adresse pour sécuriser votre compte SOFIA :",
      input.url,
      "",
      `Ce lien est valable ${input.expiresInHours} heures. Si vous n'avez pas créé de compte SOFIA, ignorez cet email.`,
    ]),
  };
}

export function invitationEmail(input: {
  inviterName: string;
  organizationName: string;
  roleLabel: string;
  url: string;
  expiresInDays: number;
}): RenderedEmail {
  const inviter = escapeHtml(input.inviterName);
  const organization = escapeHtml(input.organizationName);
  return {
    template: "invitation",
    subject: `${input.inviterName} vous invite à rejoindre ${input.organizationName} sur SOFIA`,
    html: layout({
      preheader: `Rejoignez l'équipe de ${input.organizationName}.`,
      heading: `Rejoignez ${input.organizationName}`,
      paragraphs: [
        `${inviter} vous invite à rejoindre l'équipe de <strong>${organization}</strong> sur SOFIA, avec le rôle <strong>${escapeHtml(input.roleLabel)}</strong>.`,
        "SOFIA répond aux clientes de l'établissement 24 h/24, relance les prospects et remplit l'agenda. Vous y retrouverez les conversations, les leads et les rendez-vous.",
      ],
      action: { label: "Rejoindre l'équipe", url: input.url },
      footnote: `Cette invitation expire dans ${input.expiresInDays} jours. Si vous ne connaissez pas ${inviter}, ignorez cet email.`,
    }),
    text: text([
      `${input.inviterName} vous invite à rejoindre l'équipe de ${input.organizationName} sur SOFIA (rôle : ${input.roleLabel}).`,
      "",
      "Accepter l'invitation :",
      input.url,
      "",
      `Cette invitation expire dans ${input.expiresInDays} jours.`,
    ]),
  };
}

export function passwordChangedEmail(input: { name: string; supportEmail?: string }): RenderedEmail {
  const name = escapeHtml(input.name);
  return {
    template: "password_changed",
    subject: "Votre mot de passe SOFIA a été modifié",
    html: layout({
      preheader: "Notification de sécurité.",
      heading: "Mot de passe modifié",
      paragraphs: [
        `Bonjour ${name},`,
        "Le mot de passe de votre compte SOFIA vient d'être modifié et vos autres sessions ont été déconnectées.",
      ],
      footnote:
        "Si vous n'êtes pas à l'origine de ce changement, réinitialisez immédiatement votre mot de passe depuis la page de connexion et prévenez le responsable de votre établissement.",
    }),
    text: text([
      `Bonjour ${input.name},`,
      "",
      "Le mot de passe de votre compte SOFIA vient d'être modifié et vos autres sessions ont été déconnectées.",
      "Si vous n'êtes pas à l'origine de ce changement, réinitialisez immédiatement votre mot de passe depuis la page de connexion.",
    ]),
  };
}
