# Funnel de candidature Academy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en ligne `academy.botflow-ia.fr/candidature` — un questionnaire de 14 écrans qui score les candidats côté serveur, les écrit dans Airtable, et n'ouvre Calendly qu'aux profils qualifiés.

**Architecture:** Page statique vanilla dans le projet Vercel `botflow-academy` existant (aucun build), qui poste vers une fonction serverless du même projet. Le scoring est un module pur, testé isolément, appelé par la fonction — jamais par le navigateur. L'écriture Airtable est en best effort : un échec API ne fait jamais perdre un lead ni afficher une erreur au candidat.

**Tech Stack:** HTML/CSS/JS vanilla · fonctions serverless Vercel (Node 22, CommonJS) · `node --test` (natif, aucune dépendance ajoutée) · API REST Airtable · widget Calendly inline.

**Spec:** `docs/superpowers/specs/2026-09-02-academy-qualification-funnel-design.md`

## Global Constraints

- **Aucune dépendance npm ajoutée.** `agentic-academy/` n'a pas de `package.json` et n'en aura pas : déploiement statique, zéro build. Les tests tournent avec le runner natif de Node 24.
- **CommonJS** dans `api/` (`module.exports = async (req, res) => {}`) — pas de `package.json` donc pas d'ESM.
- **DA imposée**, reprise telle quelle de `agentic-academy/index.html` : `--bg: #07090a` · `--bg-elevated: #0e1112` · `--fg: #f5f5f0` · `--fg-muted: #8a8f8a` · `--accent: #7fe3a1` · `--border: rgba(255,255,255,0.08)` · polices Geist (400-700) + Instrument Serif italic via Google Fonts.
- **Le prix 2 500 € n'apparaît nulle part** dans le code livré. Aucun montant sur `/candidature`.
- **Aucune promesse de revenu chiffrée** dans les textes (L121-2 FR, DL 57/2008 PT, directive UE 2005/29).
- **Aucun faux témoignage, aucun compteur inventé.**
- **Base Airtable** : `app7l6qJCDoWebj8s` (CRM yass_IA). **Calendly** : `https://calendly.com/yass_automat-ia/new-meeting`.
- Tous les textes destinés à l'utilisateur sont **en français, tutoiement**.

---

### Task 1: Module de scoring

Fonction pure, sans I/O, seule source de vérité du barème. Testée en premier parce que tout le reste en dépend.

**Files:**
- Create: `agentic-academy/api/_scoring.js`
- Create: `agentic-academy/tests/scoring.test.js`
- Create: `agentic-academy/.vercelignore`

**Interfaces:**
- Consumes: rien.
- Produces: `module.exports = { scoreLead }` où `scoreLead(answers: object) => { score: number, segment: 'A'|'B'|'C' }`. `answers` porte les clés `delai`, `pret_a_investir`, `temps_dispo`, `situation`, `deja_formation`, `niveau_tech`, `motivation`. Toute clé absente ou de valeur inconnue vaut 0 point.

- [ ] **Step 1: Write the failing test**

```js
// agentic-academy/tests/scoring.test.js
const test = require('node:test');
const assert = require('node:assert');
const { scoreLead } = require('../api/_scoring.js');

test('profil idéal atteint le maximum et tombe en segment A', () => {
  const { score, segment } = scoreLead({
    delai: '<3m',
    pret_a_investir: 'oui',
    temps_dispo: '+20h',
    situation: 'freelance',
    deja_formation: true,
    niveau_tech: 'nocode',
    motivation: 'x'.repeat(101),
  });
  assert.strictEqual(score, 100);
  assert.strictEqual(segment, 'A');
});

test('profil vide vaut zéro et tombe en segment C', () => {
  assert.deepStrictEqual(scoreLead({}), { score: 0, segment: 'C' });
});

test('les valeurs inconnues ne rapportent aucun point', () => {
  const { score } = scoreLead({ delai: 'la semaine prochaine', situation: 'pirate' });
  assert.strictEqual(score, 0);
});

test('une motivation de 100 caractères ou moins ne rapporte pas le bonus', () => {
  assert.strictEqual(scoreLead({ motivation: 'x'.repeat(100) }).score, 0);
  assert.strictEqual(scoreLead({ motivation: 'x'.repeat(101) }).score, 4);
});

test('deja_formation ne compte que si strictement true', () => {
  assert.strictEqual(scoreLead({ deja_formation: 'oui' }).score, 0);
  assert.strictEqual(scoreLead({ deja_formation: true }).score, 10);
});

test('les seuils de segment sont 55 et 35', () => {
  // 28 (investir oui) + 25 (délai <3m) = 53 → B
  assert.strictEqual(scoreLead({ pret_a_investir: 'oui', delai: '<3m' }).segment, 'B');
  // + 6 (5-10h) = 59 → A
  assert.strictEqual(
    scoreLead({ pret_a_investir: 'oui', delai: '<3m', temps_dispo: '5-10h' }).segment, 'A');
  // 25 (délai <3m) + 9 (entrepreneur) = 34 → C
  assert.strictEqual(scoreLead({ delai: '<3m', situation: 'entrepreneur' }).segment, 'C');
  // 25 + 10 (salarié) = 35 → B, la borne basse est inclusive
  assert.strictEqual(scoreLead({ delai: '<3m', situation: 'salarie' }).segment, 'B');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test 'agentic-academy/tests/*.test.js'`
Expected: FAIL — `Cannot find module '../api/_scoring.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// agentic-academy/api/_scoring.js
// Barème du funnel de candidature. Voir la spec §6.
// Le préfixe « _ » exclut ce fichier des fonctions déployées par Vercel.

const DELAI = { '<3m': 25, '3-6m': 18, '6-12m': 9, '+12m': 0, 'nsp': 4 };
const INVESTIR = { oui: 28, plus_tard: 10, non: 0 };
const TEMPS = { '+20h': 14, '10-20h': 11, '5-10h': 6, '<5h': 2 };
const SITUATION = { freelance: 11, salarie: 10, entrepreneur: 9, sans_emploi: 5, etudiant: 4 };
const NIVEAU = { code: 8, nocode: 8, chatgpt: 6, zero: 4 };

const SEUIL_A = 55;
const SEUIL_B = 35;

function scoreLead(answers = {}) {
  const a = answers || {};
  let score = 0;

  score += DELAI[a.delai] || 0;
  score += INVESTIR[a.pret_a_investir] || 0;
  score += TEMPS[a.temps_dispo] || 0;
  score += SITUATION[a.situation] || 0;
  score += NIVEAU[a.niveau_tech] || 0;
  if (a.deja_formation === true) score += 10;
  if (typeof a.motivation === 'string' && a.motivation.trim().length > 100) score += 4;

  const segment = score >= SEUIL_A ? 'A' : score >= SEUIL_B ? 'B' : 'C';
  return { score, segment };
}

module.exports = { scoreLead, SEUIL_A, SEUIL_B };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test 'agentic-academy/tests/*.test.js'`
Expected: PASS — 6 tests, 0 échec.

- [ ] **Step 5: Exclure les tests du déploiement**

```bash
printf 'tests\n' > agentic-academy/.vercelignore
```

Sans ça, `tests/scoring.test.js` serait servi publiquement en fichier statique.

- [ ] **Step 6: Commit**

```bash
git add agentic-academy/api/_scoring.js agentic-academy/tests/scoring.test.js agentic-academy/.vercelignore
git commit -m "feat(academy): add lead scoring module for the qualification funnel"
```

---

### Task 2: Fonction serverless d'ingestion

Reçoit les réponses, score, écrit dans Airtable, notifie, et renvoie le segment à la page pour qu'elle choisisse son écran de fin.

**Files:**
- Create: `agentic-academy/api/lead.js`
- Create: `agentic-academy/tests/lead.test.js`
- Reference: `src/app/api/lead/route.ts` (honeypot, troncature, repli FormSubmit — mêmes conventions)

**Interfaces:**
- Consumes: `require('./_scoring.js').scoreLead`
- Produces: endpoint `POST /api/lead`. Corps attendu : les 17 clés de réponse + `company_website` (honeypot) + `src`. Réponse `200 {ok: true, segment: 'A'|'B'|'C'}`. Erreurs : `400 {ok:false, error:'invalid json'|'missing fields'|'invalid email'|'consent required'}`, `405` hors POST. **Un échec Airtable renvoie quand même 200** avec le segment.

- [ ] **Step 1: Write the failing test**

```js
// agentic-academy/tests/lead.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test 'agentic-academy/tests/*.test.js'`
Expected: FAIL — `Cannot find module '../api/lead.js'`

- [ ] **Step 3: Write minimal implementation**

```js
// agentic-academy/api/lead.js
// Ingestion des candidatures Academy. Voir la spec §8.
const { scoreLead } = require('./_scoring.js');

const AIRTABLE_API = 'https://api.airtable.com/v0';
const MAX_LONG = 3000;
const MAX_COURT = 200;

const coupe = (v, n = MAX_COURT) => (v == null ? '' : String(v).slice(0, n));

// Champs texte libres, tronqués avant écriture.
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
      _subject: `🔥 Candidature Academy ${fields.Segment} (${fields.Score}/100) — ${fields.Prenom}`,
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
    try { body = JSON.parse(body); } catch {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test 'agentic-academy/tests/*.test.js'`
Expected: PASS — 15 tests au total, 0 échec.

- [ ] **Step 5: Commit**

```bash
git add agentic-academy/api/lead.js agentic-academy/tests/lead.test.js
git commit -m "feat(academy): add serverless intake for academy applications"
```

---

### Task 3: La page `/candidature`

14 écrans, un par question, barre de progression, écran de fin conditionnel au segment renvoyé par le serveur.

**Files:**
- Create: `agentic-academy/candidature.html`
- Reference: `agentic-academy/index.html:31-70` (variables CSS et primitives à recopier)

**Interfaces:**
- Consumes: `POST /api/lead` → `{ok, segment}`
- Produces: rien pour les tâches suivantes.

- [ ] **Step 1: Écrire la page**

Structure : un `<head>` copié de `index.html` (mêmes fonts, mêmes variables CSS, `noindex` en plus), puis un questionnaire piloté par un tableau `QUESTIONS`. Les `value` doivent correspondre **exactement** aux clés du barème de `_scoring.js`.

```html
<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Candidature · BotFlow.IA Academy</title>
<meta name="robots" content="noindex, nofollow" />
<meta name="theme-color" content="#07090a" />
<link rel="icon" type="image/svg+xml" href="favicon.svg" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet" />
<style>
  :root{--bg:#07090a;--bg-elevated:#0e1112;--fg:#f5f5f0;--fg-muted:#8a8f8a;--accent:#7fe3a1;--accent-glow:rgba(127,227,161,.35);--border:rgba(255,255,255,.08);--border-strong:rgba(255,255,255,.14)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:"Geist",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;line-height:1.5;min-height:100dvh;display:flex;flex-direction:column}
  .serif{font-family:"Instrument Serif",serif;font-style:italic;font-weight:400}
  .bar{height:3px;background:rgba(255,255,255,.06)}
  .bar i{display:block;height:100%;width:0;background:var(--accent);transition:width .35s cubic-bezier(.4,0,.2,1)}
  main{flex:1;display:flex;align-items:center;justify-content:center;padding:32px 24px}
  .card{width:100%;max-width:560px}
  .step{color:var(--fg-muted);font-size:13px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 14px}
  h1{font-size:clamp(26px,5vw,36px);font-weight:600;letter-spacing:-.03em;line-height:1.12;margin:0 0 8px}
  .hint{color:var(--fg-muted);font-size:15px;margin:0 0 24px}
  .opts{display:grid;gap:10px}
  .opt{display:flex;align-items:center;gap:12px;padding:15px 18px;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated);cursor:pointer;transition:border-color .15s,background .15s;font-size:16px;text-align:left;color:inherit;font-family:inherit;width:100%}
  .opt:hover{border-color:var(--border-strong)}
  .opt[aria-pressed="true"]{border-color:var(--accent);background:rgba(127,227,161,.07)}
  input[type=text],input[type=email],input[type=tel],textarea{width:100%;padding:15px 18px;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated);color:var(--fg);font:inherit;font-size:16px}
  input:focus,textarea:focus{outline:none;border-color:var(--accent)}
  textarea{min-height:130px;resize:vertical}
  .row{display:flex;gap:12px;align-items:center;margin-top:22px}
  .btn{padding:14px 26px;border-radius:999px;border:none;background:var(--accent);color:#07090a;font:inherit;font-weight:600;font-size:16px;cursor:pointer;box-shadow:0 0 40px -12px var(--accent-glow)}
  .btn[disabled]{opacity:.4;cursor:not-allowed;box-shadow:none}
  .back{background:none;border:none;color:var(--fg-muted);font:inherit;cursor:pointer;padding:14px 4px}
  .legal{color:var(--fg-muted);font-size:13px;margin-top:18px;display:flex;gap:10px;align-items:flex-start}
  .legal a{color:var(--accent)}
  .hp{position:absolute;left:-9999px}
  .end h1{margin-bottom:14px}
  .end p{color:var(--fg-muted);font-size:16px;margin:0 0 10px}
</style>
</head>
<body>
<div class="bar"><i id="bar"></i></div>
<main><div class="card" id="card"></div></main>

<script>
const QUESTIONS = [
  {k:'prenom', t:'On commence par le début.', h:'Comment tu t’appelles ?', type:'text', ph:'Ton prénom', required:true},
  {k:'instagram', t:'Ton @ Instagram ?', h:'Pour que je relie ta candidature à notre conversation.', type:'text', ph:'@'},
  {k:'situation', t:'Tu fais quoi en ce moment ?', type:'choice', opts:[
    ['salarie','Salarié(e)'],['freelance','Freelance / indépendant(e)'],['entrepreneur','J’ai déjà une activité'],['etudiant','Étudiant(e)'],['sans_emploi','Sans emploi actuellement']]},
  {k:'pays', t:'T’es où aujourd’hui ?', type:'text', ph:'Ville, pays', required:true},
  {k:'destination', t:'Et tu veux aller où ?', type:'choice', opts:[
    ['portugal','Le Portugal'],['espagne','L’Espagne'],['dubai','Dubaï'],['asie','L’Asie'],['autre','Ailleurs'],['rester','Rester ici, mais bosser d’où je veux']]},
  {k:'delai', t:'Dans quel délai tu veux que ça bouge ?', h:'Sois honnête, c’est ce qui change tout.', type:'choice', opts:[
    ['<3m','Moins de 3 mois'],['3-6m','3 à 6 mois'],['6-12m','6 à 12 mois'],['+12m','Plus de 12 mois'],['nsp','Je sais pas encore']]},
  {k:'motivation', t:'Pourquoi tu veux ce changement ?', h:'En 2 phrases, avec tes mots. C’est la question que je lis en premier.', type:'textarea', ph:'Parce que…'},
  {k:'niveau_tech', t:'T’en es où techniquement ?', h:'Zéro n’est pas un problème — c’est d’où je suis parti.', type:'choice', opts:[
    ['zero','Zéro, je pars de rien'],['chatgpt','J’ai testé ChatGPT'],['nocode','J’ai touché à Make / Zapier / n8n'],['code','Je code']]},
  {k:'blocages', t:'Qu’est-ce qui te bloque ?', h:'Plusieurs réponses possibles.', type:'multi', opts:[
    ['par_ou','Je sais pas par où commencer'],['temps','Pas le temps'],['clients','Peur de pas trouver de clients'],['tech','Pas de compétence technique'],['stagne','J’ai commencé et je stagne'],['argent','L’argent']]},
  {k:'temps_dispo', t:'Combien d’heures par semaine tu peux y mettre ?', type:'choice', opts:[
    ['<5h','Moins de 5 h'],['5-10h','5 à 10 h'],['10-20h','10 à 20 h'],['+20h','Plus de 20 h']]},
  {k:'objectif_revenu', t:'Ton objectif de revenu mensuel ?', type:'choice', opts:[
    ['1-2k','1 000 à 2 000 €'],['2-4k','2 000 à 4 000 €'],['4k+','Plus de 4 000 €'],['nsp','Je sais pas encore']]},
  {k:'deja_formation', t:'T’as déjà investi dans une formation en ligne ?', type:'choice', opts:[
    ['oui','Oui'],['non','Non, jamais']]},
  {k:'pret_a_investir', t:'Si le plan te convient, t’es prêt(e) à investir pour aller plus vite ?', h:'Il n’y a pas de mauvaise réponse — ça me dit juste comment t’aider.', type:'choice', opts:[
    ['oui','Oui'],['plus_tard','Oui, mais dans quelques mois'],['non','Non, je cherche du gratuit']]},
];

const R = {};
let i = 0;
const card = document.getElementById('card');
const bar = document.getElementById('bar');
const params = new URLSearchParams(location.search);

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function progress(n) { bar.style.width = (n / (QUESTIONS.length + 1)) * 100 + '%'; }

function render() {
  progress(i);
  if (i >= QUESTIONS.length) return renderContact();
  const q = QUESTIONS[i];
  const val = R[q.k];
  let champ = '';
  if (q.type === 'text') champ = `<input type="text" id="f" placeholder="${esc(q.ph||'')}" value="${esc(val||'')}" />`;
  else if (q.type === 'textarea') champ = `<textarea id="f" placeholder="${esc(q.ph||'')}">${esc(val||'')}</textarea>`;
  else champ = `<div class="opts">${q.opts.map(([v,l]) => {
    const on = q.type === 'multi' ? (val||[]).includes(v) : val === v;
    return `<button type="button" class="opt" data-v="${v}" aria-pressed="${on}">${esc(l)}</button>`;
  }).join('')}</div>`;

  card.innerHTML = `
    <p class="step">Question ${i+1} / ${QUESTIONS.length + 1}</p>
    <h1>${esc(q.t)}</h1>
    ${q.h ? `<p class="hint">${esc(q.h)}</p>` : ''}
    ${champ}
    <div class="row">
      ${i > 0 ? '<button type="button" class="back" id="back">← Retour</button>' : ''}
      <button type="button" class="btn" id="next">Continuer</button>
    </div>`;

  const suivant = () => {
    if (q.type === 'text' || q.type === 'textarea') R[q.k] = document.getElementById('f').value.trim();
    if (q.required && !R[q.k]) { document.getElementById('f').focus(); return; }
    i++; render();
  };

  card.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => {
    const v = b.dataset.v;
    if (q.type === 'multi') {
      const set = new Set(R[q.k] || []);
      set.has(v) ? set.delete(v) : set.add(v);
      R[q.k] = [...set];
      b.setAttribute('aria-pressed', set.has(v));
    } else {
      R[q.k] = v;
      card.querySelectorAll('.opt').forEach((o) => o.setAttribute('aria-pressed', o === b));
      setTimeout(suivant, 160); // choix unique : on enchaîne tout seul
    }
  }));
  document.getElementById('next').addEventListener('click', suivant);
  if (document.getElementById('back')) document.getElementById('back').addEventListener('click', () => { i--; render(); });
  const f = document.getElementById('f');
  if (f) { f.focus(); if (q.type === 'text') f.addEventListener('keydown', (e) => { if (e.key === 'Enter') suivant(); }); }
}

function renderContact() {
  card.innerHTML = `
    <p class="step">Dernière étape</p>
    <h1>Où je t’envoie <span class="serif">ma réponse</span> ?</h1>
    <p class="hint">Je lis chaque candidature moi-même.</p>
    <div class="opts">
      <input type="email" id="email" placeholder="ton@email.com" />
      <input type="tel" id="tel" placeholder="WhatsApp (optionnel)" />
    </div>
    <input type="text" class="hp" id="hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <label class="legal"><input type="checkbox" id="rgpd" />
      <span>J’accepte d’être recontacté(e) au sujet de ma candidature et des formations BotFlow.IA.
      <a href="mentions-legales.html" target="_blank" rel="noopener">Mentions légales</a></span></label>
    <div class="row">
      <button type="button" class="back" id="back">← Retour</button>
      <button type="button" class="btn" id="send" disabled>Envoyer ma candidature</button>
    </div>`;

  const email = document.getElementById('email');
  const rgpd = document.getElementById('rgpd');
  const send = document.getElementById('send');
  const check = () => { send.disabled = !(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value) && rgpd.checked); };
  email.addEventListener('input', check);
  rgpd.addEventListener('change', check);
  document.getElementById('back').addEventListener('click', () => { i--; render(); });

  send.addEventListener('click', async () => {
    send.disabled = true; send.textContent = 'Envoi…';
    const payload = {
      ...R,
      deja_formation: R.deja_formation === 'oui',
      email: email.value.trim(),
      telephone: document.getElementById('tel').value.trim(),
      company_website: document.getElementById('hp').value,
      rgpd: true,
      src: params.get('src') || 'direct',
    };
    let segment = 'B';
    try {
      const r = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d && d.segment) segment = d.segment;
    } catch (e) {
      // Le lead est déjà côté serveur ou perdu — on ne montre jamais d'erreur au candidat.
    }
    renderFin(segment, payload);
  });
}

function renderFin(segment, p) {
  progress(QUESTIONS.length + 1);
  if (segment === 'A') {
    const url = 'https://calendly.com/yass_automat-ia/new-meeting'
      + '?hide_gdpr_banner=1&background_color=07090a&text_color=f5f5f0&primary_color=7fe3a1'
      + '&name=' + encodeURIComponent(p.prenom || '') + '&email=' + encodeURIComponent(p.email || '');
    card.innerHTML = `<div class="end">
      <h1>${esc(p.prenom || '')}, <span class="serif">on se parle</span>.</h1>
      <p>Ton profil correspond à ce que je cherche. Choisis un créneau de 30 minutes ci-dessous — on regarde ta situation et je te dis franchement si je peux t’aider.</p>
      <div class="calendly-inline-widget" data-url="${url}" style="min-width:300px;height:680px;margin-top:20px"></div></div>`;
    const s = document.createElement('script');
    s.src = 'https://assets.calendly.com/assets/external/widget.js';
    s.async = true;
    document.body.appendChild(s);
  } else if (segment === 'B') {
    card.innerHTML = `<div class="end">
      <h1>Reçu, ${esc(p.prenom || '')}.</h1>
      <p>Je lis ta candidature moi-même et je te reviens sous 48 h avec un retour concret sur ta situation.</p>
      <p>Si tu veux gagner du temps d’ici là, réponds-moi en DM sur Instagram — je répondrai plus vite.</p></div>`;
  } else {
    card.innerHTML = `<div class="end">
      <h1>Merci ${esc(p.prenom || '')}.</h1>
      <p>Au vu de là où tu en es aujourd’hui, un accompagnement 1-1 serait prématuré — et je préfère te le dire plutôt que de te vendre quelque chose qui ne te servirait pas.</p>
      <p>Je te garde dans ma liste : je te préviens dès que j’ouvre un format adapté. En attendant, tout ce que je publie sur Instagram est gratuit.</p></div>`;
  }
}

render();
</script>
</body>
</html>
```

- [ ] **Step 2: Vérifier la page dans le navigateur**

Run: `cd agentic-academy && python3 -m http.server 4321`

Ouvrir `http://localhost:4321/candidature.html?src=dm` dans le panneau Browser, dérouler les 14 écrans, et vérifier : la barre progresse, le bouton Retour restaure les réponses saisies, le bouton d'envoi reste désactivé tant que l'email est invalide ou la case décochée. `/api/lead` renvoie 404 en local — c'est attendu, le `catch` doit afficher l'écran de fin segment B sans message d'erreur.

- [ ] **Step 3: Vérifier qu'aucun montant ne traîne**

Run: `grep -nE "2 ?500|1 ?490|490 ?€" agentic-academy/candidature.html`
Expected: aucun résultat.

- [ ] **Step 4: Commit**

```bash
git add agentic-academy/candidature.html
git commit -m "feat(academy): add the 14-screen application form"
```

---

### Task 4: Routage Vercel

**Files:**
- Create: `agentic-academy/vercel.json`

**Interfaces:**
- Consumes: `candidature.html`, `api/lead.js`
- Produces: les URL publiques `/candidature` et `/start`.

- [ ] **Step 1: Écrire la configuration**

```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "redirects": [
    { "source": "/start", "destination": "/candidature", "permanent": false }
  ]
}
```

`cleanUrls` fait servir `candidature.html` sur `/candidature`. Les fichiers de `api/` restent détectés automatiquement comme fonctions Node — aucune configuration à ajouter pour ça.

- [ ] **Step 2: Commit**

```bash
git add agentic-academy/vercel.json
git commit -m "feat(academy): route /candidature and redirect /start"
```

---

### Task 5: Retirer le prix du coaching 1:1

Le 1 490 € affiché contredit le tarif réel de 2 500 € : un candidat qui lit la page avant l'appel perd confiance au moment de l'annonce du prix. L'offre passe sur candidature.

**Files:**
- Modify: `agentic-academy/index.html:643-661` (la carte `offer feat`)
- Modify: `agentic-academy/index.html:687` (la question de FAQ sur la différence entre les offres)

**Interfaces:**
- Consumes: l'URL `/candidature` de la tâche 4.
- Produces: rien.

- [ ] **Step 1: Remplacer le prix et le bouton de la carte Coaching**

Dans la carte `<div class="offer feat reveal" ...>`, remplacer :

```html
          <p class="price">1 490 €</p>
          <p class="pay">Paiement unique</p>
```

par :

```html
          <p class="price">Sur candidature</p>
          <p class="pay">Places limitées, tarif communiqué en appel</p>
```

puis remplacer, dans cette même carte, `<span class="btn btn-full" aria-disabled="true">Academy complet</span>` par :

```html
          <a class="btn btn-full" href="/candidature?src=page">Déposer ma candidature</a>
```

- [ ] **Step 2: Mettre la FAQ en cohérence**

Remplacer le contenu de la question « Quelle est la différence entre les 2 offres ? » par :

```html
<p>L'offre Autonome (490 €) te donne tout le contenu, les templates, la formation Claude Code et 2 appels. Le Coaching 1:1 ajoute un suivi privé hebdomadaire avec moi pendant 2 mois — il se fait sur candidature, parce que je ne prends qu'un nombre limité de personnes à la fois. On en parle en appel.</p>
```

- [ ] **Step 3: Vérifier qu'aucun 1 490 ne subsiste**

Run: `grep -n "1 490" agentic-academy/index.html`
Expected: aucun résultat.

- [ ] **Step 4: Vérifier la page dans le navigateur**

Serveur local déjà lancé en tâche 3. Ouvrir `http://localhost:4321/index.html#offres` : la carte Coaching affiche « Sur candidature », le bouton est cliquable et pointe vers `/candidature?src=page`, la mise en page des deux cartes reste alignée.

- [ ] **Step 5: Commit**

```bash
git add agentic-academy/index.html
git commit -m "feat(academy): move 1:1 coaching to an application-only offer"
```

---

### Task 6: Table Airtable, variables d'environnement, mise en ligne

Dernière tâche : elle touche des systèmes réels (CRM du user, déploiement public). **Faire valider chaque étape par le user avant exécution.**

**Files:**
- Modify: `docs/superpowers/specs/2026-09-02-academy-qualification-funnel-design.md` (y noter l'id de table obtenu)

**Interfaces:**
- Consumes: `api/lead.js` (noms de champs exacts).
- Produces: `AIRTABLE_TABLE`, l'id de la table créée.

- [ ] **Step 1: Créer la table `LEADS_ACADEMY`**

Via le MCP Airtable, dans la base `app7l6qJCDoWebj8s`. Les noms de champs doivent correspondre **au caractère près** à ceux écrits par `versAirtable()` dans `api/lead.js` — sinon Airtable rejette l'écriture. Types et options : voir la spec §7.

- [ ] **Step 2: Créer les 4 vues**

🔥 Chauds à closer (`Segment` = A et `Statut` = Nouveau, tri `Score` décroissant) · 🕓 À retargeter (`Segment` ∈ {B, C}) · 📅 Appels calés (`Statut` = Appel calé) · 📊 Tout.

- [ ] **Step 3: Poser les variables d'environnement**

Dans le projet Vercel `botflow-academy` (`prj_6M5R1hAeXp0mTqN0nvEvEx78Gdvv`), portée Production :
`AIRTABLE_TOKEN` (PAT avec `data.records:write` sur la base) · `AIRTABLE_BASE=app7l6qJCDoWebj8s` · `AIRTABLE_TABLE=<id obtenu à l'étape 1>` · `NOTIFY_EMAIL=contact.botflow@gmail.com`.

- [ ] **Step 4: Déployer**

Run: `cd agentic-academy && vercel --prod`

- [ ] **Step 5: Test de bout en bout en production**

Remplir `academy.botflow-ia.fr/candidature?src=test` avec un profil chaud (délai < 3 mois, prêt à investir, +20 h). Vérifier : Calendly s'affiche avec le nom et l'email préremplis · une ligne apparaît en vue 🔥 Chauds à closer avec le bon score · l'email d'alerte arrive (première utilisation de FormSubmit : un email d'activation à confirmer une fois). Puis supprimer la ligne de test.

- [ ] **Step 6: Poser le lien en bio Instagram**

`academy.botflow-ia.fr/candidature?src=bio` — le goulot d'étranglement identifié depuis des semaines.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-09-02-academy-qualification-funnel-design.md
git commit -m "docs(academy): record the Airtable table id for the funnel"
```
