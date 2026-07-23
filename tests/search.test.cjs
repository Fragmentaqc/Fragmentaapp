const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSearchText, matchesSearchQuery } = require('../node_modules/.cache/fragmenta-tests/search.js');

test('ignore les accents, la casse et la ponctuation', () => {
  assert.equal(normalizeSearchText('  Île-d’Orléans!  '), 'ile d orleans');
});

test('trouve plusieurs mots même dans un ordre différent', () => {
  assert.equal(matchesSearchQuery('québec vélo', ['Voyage à vélo', 'Vieux-Québec']), true);
  assert.equal(matchesSearchQuery('québec kayak', ['Voyage à vélo', 'Vieux-Québec']), false);
});

test('accepte une recherche vide', () => {
  assert.equal(matchesSearchQuery('   ', ['Une aventure']), true);
});
