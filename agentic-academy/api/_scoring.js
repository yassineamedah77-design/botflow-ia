// Barème du funnel de candidature. Voir la spec §6.
// Le préfixe « _ » exclut ce fichier des fonctions déployées par Vercel.
//
// La question « délai » a été retirée du formulaire le 2026-09-02 : l'urgence est
// désormais portée par « prêt à investir » (« oui » vs « oui mais dans quelques mois »),
// et ses points ont été redistribués sur les signaux restants pour rester sur 100.

const INVESTIR = { oui: 37, plus_tard: 13, non: 0 };
const TEMPS = { '+20h': 19, '10-20h': 15, '5-10h': 8, '<5h': 3 };
const SITUATION = { freelance: 15, salarie: 13, entrepreneur: 12, sans_emploi: 7, etudiant: 5 };
const NIVEAU = { code: 11, nocode: 11, chatgpt: 8, zero: 5 };
const DEJA_FORMATION = 13;
const MOTIVATION_ECRITE = 5;

const SEUIL_A = 55;
const SEUIL_B = 35;

function scoreLead(answers = {}) {
  const a = answers || {};
  let score = 0;

  score += INVESTIR[a.pret_a_investir] || 0;
  score += TEMPS[a.temps_dispo] || 0;
  score += SITUATION[a.situation] || 0;
  score += NIVEAU[a.niveau_tech] || 0;
  if (a.deja_formation === true) score += DEJA_FORMATION;
  if (typeof a.motivation === 'string' && a.motivation.trim().length > 100) score += MOTIVATION_ECRITE;

  const segment = score >= SEUIL_A ? 'A' : score >= SEUIL_B ? 'B' : 'C';
  return { score, segment };
}

module.exports = { scoreLead, SEUIL_A, SEUIL_B };
