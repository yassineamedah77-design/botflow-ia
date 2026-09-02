const test = require('node:test');
const assert = require('node:assert');
const handler = require('../api/lead.js');

function mockRes() {
  return {
    statusCode: 0, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

const VALIDE = {
  prenom: 'Chloé', email: 'chloe@example.com', rgpd: true,
  pret_a_investir: 'oui', temps_dispo: '+20h', objectif_revenu: '2500',
  situation: 'salarie', deja_formation: true, niveau_tech: 'zero',
  motivation: 'x'.repeat(120), src: 'dm',
};

test('refuse tout ce qui n’est pas un POST', async () => {
  const res = mockRes();
  await handler({ method: 'GET', body: {} }, res);
  assert.strictEqual(res.statusCode, 405);
});

test('rejette un email invalide', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { ...VALIDE, email: 'pas-un-email' } }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'invalid email');
});

test('rejette une candidature sans consentement RGPD', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { ...VALIDE, rgpd: false } }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'consent required');
});

test('avale silencieusement les bots qui remplissent le honeypot', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: { ...VALIDE, company_website: 'spam.ru' } }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.ok, true);
});

test('renvoie le segment calculé côté serveur', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: VALIDE }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.segment, 'A');
});

test('accepte un corps encore sérialisé en chaîne', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: JSON.stringify(VALIDE) }, res);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.segment, 'A');
});

test('rejette un corps illisible', async () => {
  const res = mockRes();
  await handler({ method: 'POST', body: '{pas du json' }, res);
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(res.body.error, 'invalid json');
});

test('renvoie quand même le segment quand Airtable échoue', async () => {
  process.env.AIRTABLE_TOKEN = 'fake';
  process.env.AIRTABLE_BASE = 'appFAKE';
  process.env.AIRTABLE_TABLE = 'tblFAKE';
  const vrai = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('réseau coupé'); };
  try {
    const res = mockRes();
    await handler({ method: 'POST', body: VALIDE }, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.segment, 'A');
  } finally {
    globalThis.fetch = vrai;
    delete process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_BASE;
    delete process.env.AIRTABLE_TABLE;
  }
});

test('écrit dans Airtable les champs attendus par la table', async () => {
  process.env.AIRTABLE_TOKEN = 'fake';
  process.env.AIRTABLE_BASE = 'appFAKE';
  process.env.AIRTABLE_TABLE = 'tblFAKE';
  const vrai = globalThis.fetch;
  let envoye = null;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('airtable')) envoye = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({}) };
  };
  try {
    await handler({ method: 'POST', body: VALIDE }, mockRes());
    const f = envoye.records[0].fields;
    assert.strictEqual(f.Prenom, 'Chloé');
    assert.strictEqual(f.Score, 92);
    assert.strictEqual(f.Segment, 'A');
    assert.strictEqual(f.Statut, 'Nouveau');
    assert.strictEqual(f.Source, 'DM');
    assert.strictEqual(f.Deja_Formation, true);
    assert.strictEqual(f.Consentement_RGPD, true);
    assert.deepStrictEqual(f.Blocages, []);
    assert.strictEqual(f.Situation, 'Salarié');
    assert.strictEqual(f.Objectif_Revenu, 2500);
    assert.strictEqual(f.Temps_Dispo, '+ 20 h');
    assert.strictEqual(f.Niveau_Tech, 'Zéro');
    assert.strictEqual(f.Pret_A_Investir, 'Oui');
    assert.match(f.Date_Soumission, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    globalThis.fetch = vrai;
    delete process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_BASE;
    delete process.env.AIRTABLE_TABLE;
  }
});

test('traduit les blocages et garde les valeurs inconnues telles quelles', async () => {
  process.env.AIRTABLE_TOKEN = 'fake';
  process.env.AIRTABLE_BASE = 'appFAKE';
  process.env.AIRTABLE_TABLE = 'tblFAKE';
  const vrai = globalThis.fetch;
  let envoye = null;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('airtable')) envoye = JSON.parse(opts.body);
    return { ok: true, status: 200, json: async () => ({}) };
  };
  try {
    await handler({ method: 'POST', body: {
      ...VALIDE, blocages: ['par_ou', 'clients'], situation: 'pirate', src: 'inconnu',
    } }, mockRes());
    const f = envoye.records[0].fields;
    assert.deepStrictEqual(f.Blocages, ['Sait pas par où commencer', 'Peur de pas trouver de clients']);
    assert.strictEqual(f.Situation, 'pirate');
    assert.strictEqual(f.Source, 'inconnu');
  } finally {
    globalThis.fetch = vrai;
    delete process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_BASE;
    delete process.env.AIRTABLE_TABLE;
  }
});

test('le champ objectif de revenu accepte un chiffre libre et refuse le reste', async () => {
  process.env.AIRTABLE_TOKEN = 'fake';
  process.env.AIRTABLE_BASE = 'appFAKE';
  process.env.AIRTABLE_TABLE = 'tblFAKE';
  const vrai = globalThis.fetch;
  const lu = async (valeur) => {
    let envoye = null;
    globalThis.fetch = async (url, opts) => {
      if (String(url).includes('airtable')) envoye = JSON.parse(opts.body);
      return { ok: true, status: 200, json: async () => ({}) };
    };
    await handler({ method: 'POST', body: { ...VALIDE, objectif_revenu: valeur } }, mockRes());
    return envoye.records[0].fields.Objectif_Revenu;
  };
  try {
    assert.strictEqual(await lu('3000'), 3000);
    assert.strictEqual(await lu(4500), 4500);
    assert.strictEqual(await lu('2 500 €'), 2500);
    assert.strictEqual(await lu(''), null);
    assert.strictEqual(await lu('je sais pas'), null);
    assert.strictEqual(await lu(undefined), null);
  } finally {
    globalThis.fetch = vrai;
    delete process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_BASE;
    delete process.env.AIRTABLE_TABLE;
  }
});

test('sans Airtable configuré, toutes les candidatures partent par mail', async () => {
  process.env.NOTIFY_EMAIL = 'inbox@example.com';
  delete process.env.AIRTABLE_TOKEN;
  const vrai = globalThis.fetch;
  const sujets = [];
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('formsubmit')) sujets.push(JSON.parse(opts.body)._subject);
    return { ok: true, status: 200, json: async () => ({}) };
  };
  try {
    // Profil faible : segment C, notifié quand même faute de CRM.
    await handler({ method: 'POST', body: {
      prenom: 'Tiède', email: 't@d.fr', rgpd: true, situation: 'etudiant', temps_dispo: '<5h',
    } }, mockRes());
    assert.strictEqual(sujets.length, 1);
    assert.match(sujets[0], /Candidature Academy C \(\d+\/100\) — Tiède \[CRM non branché\]/);
  } finally {
    globalThis.fetch = vrai;
    delete process.env.NOTIFY_EMAIL;
  }
});
