const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeUsername, validatePassword, passwordsMatch } = require('../node_modules/.cache/fragmenta-tests/account-validation.js');

test('normalise un nom utilisateur', () => {
  assert.equal(normalizeUsername('  Jean Michel!_QC  '), 'jeanmichel_qc');
});

test('refuse un mot de passe trop court', () => {
  assert.equal(validatePassword('1234567'), 'Utilise au moins 8 caractères.');
  assert.equal(validatePassword('12345678'), null);
});

test('confirme deux mots de passe identiques', () => {
  assert.equal(passwordsMatch('aventure-123', 'aventure-123'), true);
  assert.equal(passwordsMatch('aventure-123', 'autre'), false);
});
