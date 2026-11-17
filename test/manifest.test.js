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

test('the release workflow publishes the manifest, not just the package', () => {
  const workflow = read('.github/workflows/release.yml');

  // The registry listing went stale between 0.1.0 and 0.2.0 precisely because
  // releasing only touched npm. If these steps are ever dropped, it drifts again.
  assert.match(workflow, /mcp-publisher publish/, 'a release must reach the MCP Registry');
  assert.match(workflow, /mcp-publisher login github-oidc/, 'an organisation namespace needs OIDC');
  assert.match(workflow, /cosign verify-blob/, 'the publisher binary must be verified before it runs');
  assert.match(workflow, /MCP_PUBLISHER_VERSION: v\d+\.\d+\.\d+/, 'the publisher version must be pinned');
  assert.doesNotMatch(
    workflow,
    /releases\/latest\/download/,
    'a mutable download URL would defeat the signature check, which pins one tag',
  );
});
