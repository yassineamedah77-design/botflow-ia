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
  assert.strictEqual(scoreLead({ pret_a_investir: 'oui', delai: '<3m' }).segment, 'B');
  assert.strictEqual(
    scoreLead({ pret_a_investir: 'oui', delai: '<3m', temps_dispo: '5-10h' }).segment, 'A');
  assert.strictEqual(scoreLead({ delai: '<3m', situation: 'entrepreneur' }).segment, 'C');
  assert.strictEqual(scoreLead({ delai: '<3m', situation: 'salarie' }).segment, 'B');
});
