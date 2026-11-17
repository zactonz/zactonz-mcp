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

test('the registry workflow publishes the manifest safely, and releasing does not attempt it', () => {
  const registry = read('.github/workflows/registry.yml');
  const release = read('.github/workflows/release.yml');

  assert.match(registry, /mcp-publisher publish/, 'something must reach the MCP Registry');
  assert.match(registry, /mcp-publisher login github-oidc/, 'an organisation namespace needs OIDC');
  assert.match(registry, /cosign verify-blob/, 'the publisher binary must be verified before it runs');
  assert.match(registry, /MCP_PUBLISHER_VERSION: v\d+\.\d+\.\d+/, 'the publisher version must be pinned');
  assert.doesNotMatch(
    registry,
    /releases\/latest\/download/,
    'a mutable download URL would defeat the signature check, which pins one tag',
  );
  // The reason the two are separate: a scoped npm publish waits in staging, so
  // at the end of a release the version the manifest names is not installable.
  assert.match(registry, /npm view "\$package@\$version"/, 'the manifest must not name a version nobody can install');
  assert.doesNotMatch(release, /mcp-publisher/, 'releasing must not attempt what it cannot finish');
});

test('the deprecation workflow cannot be aimed at every version, or made to run shell', () => {
  const workflow = read('.github/workflows/deprecate.yml');

  // `npm deprecate pkg@*` deprecates everything ever published, and the
  // version arrives from whoever starts the run, so it is checked first.
  assert.match(
    workflow,
    /\^\[0-9\]\+\\\.\[0-9\]\+\\\.\[0-9\]\+/,
    'the version must be checked against one exact version',
  );
  assert.match(workflow, /npm deprecate "@zactonz\/mcp\$\{?VERSION\}?"|npm deprecate "@zactonz\/mcp@\$VERSION"/);
  // Both inputs reach the script as environment variables. Interpolating them
  // into the run block would let a message run as shell.
  assert.doesNotMatch(
    workflow.split('run: npm deprecate')[1] ?? '',
    /\$\{\{/,
    'inputs must not be interpolated into the command',
  );
  assert.match(workflow, /MESSAGE: \$\{\{ inputs\.message \}\}/, 'the message is passed as an environment variable');
  assert.match(workflow, /timeout-minutes:/, 'a stuck job must fail rather than run for six hours');
});

test('the engine floor matches what the dependencies actually require', () => {
  // @hono/node-server, which the SDK's Node HTTP transport wraps, declares
  // >=20. 0.2.0 shipped claiming >=18 and could not honour it.
  assert.equal(pkg.engines.node, '>=20');
  assert.doesNotMatch(
    read('README.md'),
    /Node\.js 1[0-9] or newer/,
    'the README must not promise a Node we do not support',
  );
  assert.doesNotMatch(
    read('.github/workflows/ci.yml'),
    /'18'/,
    'CI must not claim to verify a version we do not support',
  );
});
