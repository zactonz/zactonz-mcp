import assert from 'node:assert/strict';
import { test } from 'node:test';
import { missingKeyMessage, parseKeys } from '../src/keys.js';

test('parseKeys files each key under the product in its prefix', () => {
  const keys = parseKeys('zk_qr_abc, zk_screen_def\nzk_domain_ghi');

  assert.deepEqual(keys.products, ['qr', 'screen', 'domain']);
  assert.equal(keys.get('screen'), 'zk_screen_def');
  assert.equal(keys.has('og'), false);
  assert.equal(keys.get('og'), undefined);
  assert.deepEqual(keys.rejected, []);
});

test('parseKeys rejects values that are not Zactonz keys and masks them', () => {
  const keys = parseKeys('zk_qr_abc,plain-secret-value,ZK_SCREEN_DEF,zk_og_');

  assert.deepEqual(keys.products, ['qr']);
  assert.deepEqual(keys.rejected, ['plain-…', 'ZK_SCR…', 'zk_og_…']);
  assert.equal(keys.has('screen'), false);
  assert.equal(keys.get('domain'), undefined);
});

test('parseKeys returns an empty keyring for empty input', () => {
  for (const value of [undefined, null, '', ' , ']) {
    const keys = parseKeys(value);
    assert.deepEqual(keys.products, []);
    assert.deepEqual(keys.rejected, []);
  }
});

test('missingKeyMessage names the product, the variable and the console', () => {
  const message = missingKeyMessage('screen');

  assert.match(message, /"screen"/);
  assert.match(message, /ZACTONZ_API_KEYS/);
  assert.match(message, /developers\.zactonz\.com\/console/);
});
