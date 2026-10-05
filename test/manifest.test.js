import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { VERSION } from '../src/api.js';

const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const manifest = JSON.parse(read('server.json'));

test('package.json, server.json, the changelog and the server agree on the version', () => {
  assert.equal(pkg.version, VERSION);
  assert.equal(manifest.version, VERSION);
  assert.equal(manifest.packages[0].version, VERSION);
  assert.equal(/^## (\d+\.\d+\.\d+)/m.exec(read('CHANGELOG.md'))?.[1], VERSION);
});

test('server.json names the published package', () => {
  assert.equal(manifest.packages[0].identifier, pkg.name);
  assert.equal(manifest.name, pkg.mcpName);
  assert.equal(manifest.packages[0].transport.type, 'stdio');
});

test('server.json stays within the registry limits', () => {
  assert.match(manifest.name, /^[a-zA-Z0-9.-]+\/[a-zA-Z0-9._-]+$/);
  assert.ok(
    manifest.description.length >= 1 && manifest.description.length <= 100,
    `${manifest.description.length} characters`,
  );
  assert.ok(manifest.title.length <= 100);
  assert.ok(
    manifest.packages[0].environmentVariables.some(
      (variable) => variable.name === 'ZACTONZ_API_KEYS' && variable.isSecret,
    ),
  );
});
