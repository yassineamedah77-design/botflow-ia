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
  delai: '<3m', pret_a_investir: 'oui', temps_dispo: '+20h',
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
    assert.strictEqual(f.Score, 95);
    assert.strictEqual(f.Segment, 'A');
    assert.strictEqual(f.Statut, 'Nouveau');
    assert.strictEqual(f.Source, 'dm');
    assert.strictEqual(f.Deja_Formation, true);
    assert.strictEqual(f.Consentement_RGPD, true);
    assert.deepStrictEqual(f.Blocages, []);
    assert.match(f.Date_Soumission, /^\d{4}-\d{2}-\d{2}$/);
  } finally {
    globalThis.fetch = vrai;
    delete process.env.AIRTABLE_TOKEN;
    delete process.env.AIRTABLE_BASE;
    delete process.env.AIRTABLE_TABLE;
  }
});
