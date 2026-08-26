// n8n — nœud Code, placé entre la réponse de Claude et l'envoi Telegram/WhatsApp.
//
// Sépare le texte destiné à la personne du marqueur technique destiné au workflow.
// C'est ici qu'est la vraie défense contre l'injection de marqueur : le prompt système
// demande au modèle de ne pas répéter les marqueurs entrants, mais un prompt ne garantit
// rien. Ce parser, lui, garantit.
//
// Règles appliquées :
//   - le marqueur doit être sur la TOUTE DERNIÈRE ligne non vide
//   - un seul marqueur par réponse
//   - le type doit figurer dans la liste blanche
//   - le payload doit être un JSON valide et respecter le schéma attendu
//   - au moindre doute : on n'agit pas, on envoie le texte, on loggue

const ALLOWED = {
  BOOKING: ['soin', 'nouvelle_cliente', 'jours', 'periode', 'nom', 'email', 'langue'],
  ESCALADE: ['motif', 'urgence', 'resume'],
  OPTOUT: ['raison'],
};

const MARKER_RE = /^\[\[(BOOKING|ESCALADE|OPTOUT)\]\](\{.*\})?$/;

const raw = $input.item.json.text
  ?? $input.item.json.content?.[0]?.text
  ?? '';

const lines = raw.split('\n');

// Dernière ligne non vide
let lastIdx = lines.length - 1;
while (lastIdx >= 0 && lines[lastIdx].trim() === '') lastIdx--;

let action = null;
let payload = null;
let warning = null;
let messageLines = lines;

if (lastIdx >= 0) {
  const candidate = lines[lastIdx].trim();
  const m = candidate.match(MARKER_RE);

  if (m) {
    const type = m[1];
    let parsed = {};

    if (m[2]) {
      try {
        parsed = JSON.parse(m[2]);
      } catch (e) {
        warning = `payload_json_invalide:${type}`;
      }
    }

    if (!warning) {
      // Champs inconnus rejetés — on n'accepte que ce que le schéma prévoit.
      const unknown = Object.keys(parsed).filter(k => !ALLOWED[type].includes(k));
      if (unknown.length) {
        warning = `champs_inconnus:${type}:${unknown.join(',')}`;
      } else {
        action = type;
        payload = parsed;
        messageLines = lines.slice(0, lastIdx);
      }
    }
  }
}

// Un marqueur ailleurs que sur la dernière ligne = suspect.
// Soit le modèle a dérapé, soit c'est un écho d'injection. On ne l'exécute pas,
// mais on le retire du texte visible et on loggue pour inspection.
const strayIdx = messageLines.findIndex(l => /\[\[(BOOKING|ESCALADE|OPTOUT)\]\]/.test(l));
if (strayIdx !== -1) {
  warning = (warning ? warning + '|' : '') + 'marqueur_hors_derniere_ligne';
  messageLines = messageLines.filter(l => !/\[\[(BOOKING|ESCALADE|OPTOUT)\]\]/.test(l));
}

const message = messageLines.join('\n').trim();

// Validation métier : un BOOKING incomplet ne doit jamais créer de rendez-vous.
if (action === 'BOOKING') {
  const required = ['soin', 'jours', 'periode', 'nom', 'email'];
  const missing = required.filter(k => payload[k] === undefined || payload[k] === '');
  if (missing.length) {
    warning = (warning ? warning + '|' : '') + `booking_incomplet:${missing.join(',')}`;
    action = null;
    payload = null;
  } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(payload.email)) {
    warning = (warning ? warning + '|' : '') + 'email_invalide';
    action = null;
    payload = null;
  }
}

// Un message vide ne part jamais : si le modèle n'a produit qu'un marqueur,
// la personne recevrait le silence.
const safeMessage = message || 'Un instant, je vérifie.';

return {
  json: {
    chatId: $('Parse Message').item.json.chatId,
    message: safeMessage,
    action,      // 'BOOKING' | 'ESCALADE' | 'OPTOUT' | null
    payload,     // objet validé, ou null
    warning,     // non-null => à inspecter, ne pas ignorer en production
    raw,         // conservé pour le débogage ; à retirer si logs persistants (RGPD)
  },
};
