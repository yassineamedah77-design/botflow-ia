// Ingestion des candidatures Academy. Voir la spec §8.
const { scoreLead } = require('./_scoring.js');

const AIRTABLE_API = 'https://api.airtable.com/v0';
const MAX_LONG = 3000;
const MAX_COURT = 200;

const coupe = (v, n = MAX_COURT) => (v == null ? '' : String(v).slice(0, n));

// Les réponses arrivent sous forme de clés techniques (elles doivent correspondre au
// barème). Airtable, lui, est lu à la main pour closer : on y écrit du français.
const LIBELLES = {
  situation: { salarie: 'Salarié', freelance: 'Freelance', entrepreneur: 'A déjà une activité', etudiant: 'Étudiant', sans_emploi: 'Sans emploi' },
  destination: { portugal: 'Portugal', espagne: 'Espagne', dubai: 'Dubaï', asie: 'Asie', autre: 'Ailleurs', rester: 'Reste sur place' },
  delai: { '<3m': '< 3 mois', '3-6m': '3-6 mois', '6-12m': '6-12 mois', '+12m': '+ 12 mois', nsp: 'Ne sait pas' },
  niveau_tech: { zero: 'Zéro', chatgpt: 'A testé ChatGPT', nocode: 'No-code', code: 'Code' },
  blocages: { par_ou: 'Sait pas par où commencer', temps: 'Pas le temps', clients: 'Peur de pas trouver de clients', tech: 'Pas de compétence tech', stagne: 'Stagne', argent: 'Argent' },
  temps_dispo: { '<5h': '< 5 h', '5-10h': '5-10 h', '10-20h': '10-20 h', '+20h': '+ 20 h' },
  objectif_revenu: { '1-2k': '1-2 k€', '2-4k': '2-4 k€', '4k+': '4 k€ +', nsp: 'Ne sait pas' },
  pret_a_investir: { oui: 'Oui', plus_tard: 'Plus tard', non: 'Non' },
  src: { dm: 'DM', bio: 'Bio', story: 'Story', page: 'Page academy', direct: 'Direct' },
};

// Valeur inconnue : on écrit la valeur brute plutôt que rien, pour ne pas perdre l'info.
const lib = (champ, v) => (v == null || v === '' ? '' : (LIBELLES[champ][v] || String(v).slice(0, MAX_COURT)));

function versAirtable(body, score, segment) {
  return {
    Prenom: coupe(body.prenom),
    Instagram: coupe(body.instagram),
    Email: coupe(body.email),
    Telephone: coupe(body.telephone, 50),
    Pays: coupe(body.pays),
    Destination: lib('destination', body.destination),
    Situation: lib('situation', body.situation),
    Delai: lib('delai', body.delai),
    Motivation: coupe(body.motivation, MAX_LONG),
    Niveau_Tech: lib('niveau_tech', body.niveau_tech),
    Blocages: Array.isArray(body.blocages) ? body.blocages.map((b) => lib('blocages', b)) : [],
    Temps_Dispo: lib('temps_dispo', body.temps_dispo),
    Objectif_Revenu: lib('objectif_revenu', body.objectif_revenu),
    Deja_Formation: body.deja_formation === true,
    Pret_A_Investir: lib('pret_a_investir', body.pret_a_investir),
    Score: score,
    Segment: segment,
    Source: lib('src', body.src) || 'Direct',
    Date_Soumission: new Date().toISOString().slice(0, 10),
    Statut: 'Nouveau',
    Consentement_RGPD: true,
    Notes: coupe(body.notes, MAX_LONG),
  };
}

async function ecrireAirtable(fields) {
  const { AIRTABLE_TOKEN, AIRTABLE_BASE, AIRTABLE_TABLE } = process.env;
  if (!AIRTABLE_TOKEN || !AIRTABLE_BASE || !AIRTABLE_TABLE) return;
  const r = await fetch(`${AIRTABLE_API}/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    // typecast: laisse Airtable créer les options de select absentes.
    body: JSON.stringify({ records: [{ fields }], typecast: true }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`airtable ${r.status}`);
}

// Alerte immédiate sur les profils chauds — même relais que src/app/api/lead/route.ts.
async function notifier(fields) {
  const to = process.env.NOTIFY_EMAIL;
  if (!to) return;
  await fetch(`https://formsubmit.co/ajax/${to}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      _subject: `Candidature Academy ${fields.Segment} (${fields.Score}/100) — ${fields.Prenom}`,
      ...fields,
    }),
    signal: AbortSignal.timeout(8000),
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: 'invalid json' });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'invalid json' });
  }

  // Honeypot rempli → on fait croire au succès et on jette.
  if (body.company_website) return res.status(200).json({ ok: true, segment: 'C' });

  if (!body.prenom || !body.email) {
    return res.status(400).json({ ok: false, error: 'missing fields' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    return res.status(400).json({ ok: false, error: 'invalid email' });
  }
  if (body.rgpd !== true) {
    return res.status(400).json({ ok: false, error: 'consent required' });
  }

  const { score, segment } = scoreLead(body);
  const fields = versAirtable(body, score, segment);

  // Trace dans les logs Vercel : un lead n'est jamais perdu, même si Airtable tombe.
  console.log('[candidature]', JSON.stringify(fields));

  try {
    await ecrireAirtable(fields);
  } catch (err) {
    console.error('[candidature] airtable KO', err && err.message);
  }
  try {
    if (segment === 'A') await notifier(fields);
  } catch (err) {
    console.error('[candidature] notif KO', err && err.message);
  }

  return res.status(200).json({ ok: true, segment });
};
