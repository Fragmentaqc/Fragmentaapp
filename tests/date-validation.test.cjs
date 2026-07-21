const test = require('node:test');
const assert = require('node:assert/strict');
const { parseLocalDate } = require('../node_modules/.cache/fragmenta-tests/date-validation.js');

test('convertit une date valide sans décalage de jour', () => {
  assert.equal(parseLocalDate('2026-07-21'), '2026-07-21T12:00:00.000Z');
});

test('accepte une date vide', () => {
  assert.equal(parseLocalDate('   '), null);
});

test('refuse un format incomplet', () => {
  assert.equal(parseLocalDate('21-07-2026'), undefined);
  assert.equal(parseLocalDate('2026-7-2'), undefined);
});

test('refuse une date inexistante', () => {
  assert.equal(parseLocalDate('2026-02-30'), undefined);
  assert.equal(parseLocalDate('2025-02-29'), undefined);
});

test('accepte un jour intercalaire valide', () => {
  assert.equal(parseLocalDate('2024-02-29'), '2024-02-29T12:00:00.000Z');
});
