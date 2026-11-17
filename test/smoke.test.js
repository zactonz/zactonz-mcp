import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport, getDefaultEnvironment } from '@modelcontextprotocol/sdk/client/stdio.js';
import { VERSION } from '../src/api.js';

/*
 * The shipped command, started as a client or an operator starts it. Every
 * other test file reaches past bin/ and src/main.js to build a server in
 * process, so nothing else would notice if starting one stopped working.
 *
 * Only the API is stood in for, by a stub on loopback: that way a run needs no
 * key, spends no quota and reaches no network. Everything on this side of it —
 * argument parsing, settings, the transport, the governor — is the real thing.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BIN = fileURLToPath(new URL('../bin/zactonz-mcp.js', import.meta.url));
const KEY = 'zk_qr_smokesmokesmokesmokesmoke';
const STARTUP = 15000;

/** A stand-in for api.zactonz.com. */
async function stubApi(reply = { qr: 'https://api.zactonz.com/qr/enc/i/smoke.png' }) {
  /** @type {string[]} */
  const paths = [];
  const stub = createServer((request, response) => {
    const path = (request.url ?? '').split('?')[0];
    paths.push(path);
    const data =
      path === '/auth/me/' ? { key: { product: 'qr', state: 'active' }, quota: { day: { remaining: 480 } } } : reply;
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ status: 200, data }));
  });
  const port = await new Promise((resolve) => {
    stub.listen(0, '127.0.0.1', () => resolve(/** @type {{ port: number }} */ (stub.address()).port));
  });
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    paths,
    close: () => new Promise((resolve) => stub.close(() => resolve(undefined))),
  };
}

/**
 * Settings every spawn starts from: inline images off, so that a reply from
 * the stub naming a production link is never followed.
 *
 * It builds on getDefaultEnvironment() rather than process.env, and that is
 * load-bearing: the SDK's allowlist is HOME, LOGNAME, PATH, SHELL, TERM and
 * USER, so a ZACTONZ_API_KEYS sitting in the shell cannot reach a spawn here
 * and send a real key to production. Spreading process.env would undo it.
 *
 * @param {Record<string, string>} [extra]
 */
function settings(extra = {}) {
  return { ...getDefaultEnvironment(), ZACTONZ_MCP_INLINE_IMAGE_BYTES: '0', ...extra };
}

/**
 * Runs the command to completion, for the arguments that print and exit.
 *
 * @param {string[]} args
 * @param {Record<string, string>} [env]
 */
function run(args, env = settings()) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], { cwd: ROOT, env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/**
 * Starts the command listening and waits until it says where, so a test never
 * races the bind.
 *
 * @param {Record<string, string>} env
 * @param {string[]} [args]
 */
async function listening(env, args = ['--http', '--port', '0']) {
  const child = spawn(process.execPath, [BIN, ...args], { cwd: ROOT, env });
  let stderr = '';
  const stop = () => {
    child.kill('SIGTERM');
  };
  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`no listening line within ${STARTUP}ms. stderr:\n${stderr}`)),
        STARTUP,
      );
      child.on('error', reject);
      child.on('close', (code) => reject(new Error(`exited with ${code} before listening. stderr:\n${stderr}`)));
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
        const found = /listening for MCP on http:\/\/\S+?:(\d+)\/mcp/.exec(stderr);
        if (found) {
          clearTimeout(timer);
          resolve(Number(found[1]));
        }
      });
    });
    return { origin: `http://127.0.0.1:${port}`, stderr: () => stderr, stop };
  } catch (error) {
    stop();
    throw error;
  }
}

/**
 * @param {string} origin
 * @param {unknown} body
 */
async function rpc(origin, body) {
  const response = await fetch(`${origin}/mcp`, {
    method: 'POST',
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  const line = text.split('\n').find((entry) => entry.startsWith('data: '));
  return { status: response.status, result: line ? JSON.parse(line.slice(6)).result : null, text };
}

/** A client talking to the command over its own stdin and stdout. */
async function overStdio(env) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [BIN],
    cwd: ROOT,
    env,
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk) => (stderr += chunk));
  const client = new Client({ name: 'smoke', version: '1.0.0' });
  await client.connect(transport);
  return { client, stderr: () => stderr, close: () => client.close() };
}

test('the command reports its version and exits', async () => {
  const printed = await run(['--version']);

  assert.equal(printed.code, 0);
  assert.equal(printed.stdout.trim(), VERSION);
  assert.equal(printed.stderr, '', 'nothing to warn about, so nothing is said');
});

test('the command explains itself and exits', async () => {
  const printed = await run(['--help']);

  assert.equal(printed.code, 0);
  assert.match(printed.stdout, /--http\s+listen instead of speaking on stdio/);
  assert.match(printed.stdout, /ZACTONZ_API_KEYS/);
  assert.match(printed.stdout, new RegExp(`^zactonz-mcp ${VERSION.replace(/\./g, '\\.')}`));
});

test('a client can drive the command over stdio', async () => {
  const api = await stubApi();
  const server = await overStdio(settings({ ZACTONZ_API_KEYS: KEY, ZACTONZ_BASE_URL: api.baseUrl }));
  try {
    const capabilities = server.client.getServerCapabilities();
    assert.ok(capabilities?.tools && capabilities?.resources && capabilities?.prompts);

    const listed = (await server.client.listTools()).tools.map((tool) => tool.name);
    assert.deepEqual(listed, ['generate_qr_code', 'read_qr_code', 'check_api_key']);
    assert.deepEqual(
      (await server.client.listResources()).resources.map((resource) => resource.uri),
      ['zactonz://tools/generate_qr_code', 'zactonz://tools/read_qr_code'],
    );
    assert.deepEqual((await server.client.listPrompts()).prompts, [], 'no prompt has a tool behind it with a qr key');

    const called = await server.client.callTool({ name: 'generate_qr_code', arguments: { content: 'smoke' } });
    assert.equal(called.isError, undefined, JSON.stringify(called.content));
    assert.deepEqual(called.structuredContent, { qr: 'https://api.zactonz.com/qr/enc/i/smoke.png' });
    assert.deepEqual(api.paths, ['/qr/enc/']);
  } finally {
    await server.close();
    await api.close();
  }
});

test('what the operator is told stays out of the protocol', async () => {
  const api = await stubApi();
  // stdout carries the protocol over stdio, so a warning written to it would
  // break the handshake rather than merely look untidy.
  const server = await overStdio(
    settings({
      ZACTONZ_API_KEYS: `not-a-key,${KEY}`,
      ZACTONZ_MCP_INLINE_IMAGE_BYTES: 'big',
      ZACTONZ_MCP_MAX_CONCURRENCY: 'lots',
      ZACTONZ_BASE_URL: api.baseUrl,
    }),
  );
  try {
    assert.ok((await server.client.listTools()).tools.length > 0, 'the handshake survived three warnings');

    const said = server.stderr();
    assert.match(said, /ignored not-a-…/);
    assert.match(said, /ZACTONZ_MCP_INLINE_IMAGE_BYTES="big"/);
    assert.match(said, /ZACTONZ_MCP_MAX_CONCURRENCY="lots"/);
    assert.doesNotMatch(said, /not-a-key/, 'a rejected value is reported without being printed');
  } finally {
    await server.close();
    await api.close();
  }
});

test('the command listens, answers a probe, and takes keys from a request', async () => {
  const api = await stubApi();
  const server = await listening(settings({ ZACTONZ_API_KEYS: KEY, ZACTONZ_BASE_URL: api.baseUrl }));
  try {
    const health = await (await fetch(`${server.origin}/healthz`)).json();
    assert.equal(health.status, 'ok');
    assert.equal(health.version, VERSION);
    assert.equal(health.apiTools, 18);
    assert.equal(health.environmentKeys, 1);
    assert.deepEqual(health.api, { active: 0, waiting: 0, pausedFor: 0 });

    const called = await rpc(server.origin, {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'generate_qr_code', arguments: { content: 'smoke' } },
    });
    assert.equal(called.status, 200);
    assert.deepEqual(called.result.structuredContent, { qr: 'https://api.zactonz.com/qr/enc/i/smoke.png' });

    // A different key in the header, and the tool list follows it.
    const response = await fetch(`${server.origin}/mcp`, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        'x-zactonz-api-keys': 'zk_domain_smokesmokesmokesmoke',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    });
    const names = [...(await response.text()).matchAll(/"name":"([a-z_]+)"/g)].map((match) => match[1]);
    assert.deepEqual(names, ['lookup_dns', 'inspect_ssl_certificate', 'lookup_whois', 'check_api_key']);
  } finally {
    server.stop();
    await api.close();
  }
});

test('a port it cannot have is reported as a failure to start', async () => {
  const taken = createServer(() => {});
  const port = await new Promise((resolve) => {
    taken.listen(0, '127.0.0.1', () => resolve(/** @type {{ port: number }} */ (taken.address()).port));
  });
  try {
    const printed = await run(['--http', '--port', String(port)], settings({ ZACTONZ_API_KEYS: KEY }));

    assert.equal(printed.code, 1, printed.stderr);
    assert.match(printed.stderr, /zactonz-mcp: .*EADDRINUSE/);
    assert.doesNotMatch(printed.stderr, /listening for MCP/);
  } finally {
    await new Promise((resolve) => taken.close(() => resolve(undefined)));
  }
});
