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
