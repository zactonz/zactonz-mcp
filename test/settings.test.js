import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readSettings } from '../src/main.js';

test('readSettings uses defaults when only keys are set', () => {
  const settings = readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc' });

  assert.deepEqual(settings.keys.products, ['qr']);
  assert.equal(settings.inlineImageBytes, 750000);
  assert.equal(settings.baseUrl, 'https://api.zactonz.com');
  assert.deepEqual(settings.warnings, []);
});

test('readSettings treats an empty image limit as unset', () => {
  assert.equal(
    readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc', ZACTONZ_MCP_INLINE_IMAGE_BYTES: '' }).inlineImageBytes,
    750000,
  );
  assert.equal(
    readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc', ZACTONZ_MCP_INLINE_IMAGE_BYTES: '  ' }).inlineImageBytes,
    750000,
  );
});

test('readSettings accepts zero to turn inline images off', () => {
  assert.equal(
    readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc', ZACTONZ_MCP_INLINE_IMAGE_BYTES: '0' }).inlineImageBytes,
    0,
  );
});

test('readSettings warns about an image limit that is not a number', () => {
  const settings = readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc', ZACTONZ_MCP_INLINE_IMAGE_BYTES: 'big' });

  assert.equal(settings.inlineImageBytes, 750000);
  assert.match(settings.warnings[0], /ZACTONZ_MCP_INLINE_IMAGE_BYTES="big"/);
});

test('readSettings warns when no key is usable', () => {
  assert.match(readSettings({}).warnings[0], /holds no usable key/);
});

test('readSettings warns about malformed keys without printing them', () => {
  const settings = readSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc,sk-live-0123456789' });

  assert.match(settings.warnings[0], /ignored sk-liv…/);
  assert.doesNotMatch(settings.warnings.join(' '), /0123456789/);
});

test('readSettings warns about a key for a product that has no tools', () => {
  const settings = readSettings({ ZACTONZ_API_KEYS: 'zk_screenshot_abc' });

  assert.ok(settings.warnings.some((warning) => /"screenshot" matches no tool/.test(warning)));
});
