// Ingestion des candidatures Academy. Voir la spec §8.
const { scoreLead } = require('./_scoring.js');

const AIRTABLE_API = 'https://api.airtable.com/v0';
const MAX_LONG = 3000;
const MAX_COURT = 200;

const coupe = (v, n = MAX_COURT) => (v == null ? '' : String(v).slice(0, n));

function versAirtable(body, score, segment) {
  return {
    Prenom: coupe(body.prenom),
    Instagram: coupe(body.instagram),
    Email: coupe(body.email),
    Telephone: coupe(body.telephone, 50),
    Pays: coupe(body.pays),
    Destination: coupe(body.destination),
    Situation: coupe(body.situation),
    Delai: coupe(body.delai),
    Motivation: coupe(body.motivation, MAX_LONG),
    Niveau_Tech: coupe(body.niveau_tech),
    Blocages: Array.isArray(body.blocages) ? body.blocages.map((b) => coupe(b, 60)) : [],
    Temps_Dispo: coupe(body.temps_dispo),
    Objectif_Revenu: coupe(body.objectif_revenu),
    Deja_Formation: body.deja_formation === true,
    Pret_A_Investir: coupe(body.pret_a_investir),
    Score: score,
    Segment: segment,
    Source: coupe(body.src, 30) || 'Direct',
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
