const test = require('node:test');
const assert = require('node:assert');
const { scoreLead } = require('../api/_scoring.js');

test('profil idéal atteint le maximum et tombe en segment A', () => {
  const { score, segment } = scoreLead({
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
  assert.strictEqual(scoreLead({ situation: 'pirate', temps_dispo: 'la nuit' }).score, 0);
});

test('le délai retiré du formulaire ne rapporte plus rien', () => {
  assert.strictEqual(scoreLead({ delai: '<3m' }).score, 0);
});

test('une motivation de 100 caractères ou moins ne rapporte pas le bonus', () => {
  assert.strictEqual(scoreLead({ motivation: 'x'.repeat(100) }).score, 0);
  assert.strictEqual(scoreLead({ motivation: 'x'.repeat(101) }).score, 5);
});

test('deja_formation ne compte que si strictement true', () => {
  assert.strictEqual(scoreLead({ deja_formation: 'oui' }).score, 0);
  assert.strictEqual(scoreLead({ deja_formation: true }).score, 13);
});

test('prêt à investir reste le signal dominant', () => {
  // À lui seul il ne suffit pas : 37 < 55.
  assert.strictEqual(scoreLead({ pret_a_investir: 'oui' }).segment, 'B');
  // 37 + 19 (+20h) = 56 → A
  assert.strictEqual(scoreLead({ pret_a_investir: 'oui', temps_dispo: '+20h' }).segment, 'A');
  // Sans lui, il faut tout le reste : 19 + 15 + 13 + 11 + 5 = 63 → A
  assert.strictEqual(scoreLead({
    temps_dispo: '+20h', situation: 'freelance', deja_formation: true,
    niveau_tech: 'code', motivation: 'x'.repeat(120),
  }).segment, 'A');
});

test('les seuils de segment sont 55 et 35', () => {
  // 13 (plus tard) + 15 (10-20h) + 13 (salarié) = 41 → B
  assert.strictEqual(scoreLead({ pret_a_investir: 'plus_tard', temps_dispo: '10-20h', situation: 'salarie' }).segment, 'B');
  // 13 (plus tard) + 8 (5-10h) + 13 (salarié) = 34 → C, la borne est stricte
  assert.strictEqual(scoreLead({ pret_a_investir: 'plus_tard', temps_dispo: '5-10h', situation: 'salarie' }).segment, 'C');
});
