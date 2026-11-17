import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createApi } from '../src/api.js';
import { createGovernor } from '../src/governor.js';
import { HEALTH_PATH, KEYS_HEADER, MCP_PATH, createHttpServer, listen, readHttpSettings } from '../src/http.js';
import { parseKeys } from '../src/keys.js';
import { KEYS, fakeFetch, ok } from './helpers.js';

const ACCEPT = 'application/json, text/event-stream';

/**
 * Starts the listener on a free loopback port, with the API behind a fake
 * fetch and every keyring it builds recorded.
 */
async function start({ keys = KEYS, queue = [], ...options } = {}) {
  const { fetch, calls } = fakeFetch(...queue);
  /** @type {string[][]} */
  const keyrings = [];
  /** @type {string[]} */
  const logs = [];
  const listener = createHttpServer({
    keys: parseKeys(keys),
    makeApi: ({ keys: keyring, governor }) => {
      keyrings.push(keyring.products);
      return createApi({ keys: keyring, governor, fetch, sleep: async () => {} });
    },
    log: (line) => logs.push(line),
    ...options,
  });
  const bound = await listen(listener, 0, '127.0.0.1');
  return {
    origin: `http://127.0.0.1:${bound.port}`,
    port: bound.port,
    calls,
    keyrings,
    logs,
    close: () => new Promise((resolve) => listener.close(() => resolve(undefined))),
  };
}

/** A real MCP client over streamable HTTP, so the protocol is exercised end to end. */
async function connect(origin, headers = {}) {
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${origin}${MCP_PATH}`), { requestInit: { headers } }),
  );
  return client;
}

/**
 * Sends one request and reads the whole answer. This goes through node:http
 * rather than fetch() for two reasons: fetch() silently drops a Host header,
 * which is the header the guard exists for, and leaving a response body unread
 * holds the connection open until the server is closed.
 */
function raw(port, { path = MCP_PATH, method = 'POST', headers = {}, body = null } = {}) {
  const payload = body === null ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const sent = httpRequest(
      {
        host: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          accept: ACCEPT,
          'content-type': 'application/json',
          ...(payload === null ? {} : { 'content-length': Buffer.byteLength(payload) }),
          ...headers,
        },
      },
      (response) => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          text += chunk;
        });
        response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, text }));
      },
    );
    sent.on('error', reject);
    sent.end(payload ?? undefined);
  });
}

function callBody(name, args, id = 1) {
  return { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } };
}

async function until(condition) {
  for (let attempt = 0; attempt < 200; attempt++) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('condition was never met');
}

test('the health endpoint answers without naming the products that have keys', async () => {
  const server = await start();
  try {
    const response = await raw(server.port, { path: HEALTH_PATH, method: 'GET' });
    const body = JSON.parse(response.text);

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
    assert.equal(body.name, 'zactonz-mcp');
    assert.equal(body.version, '0.2.0');
    assert.equal(body.environmentKeys, 12);
    assert.ok(body.tools > 0);
    assert.deepEqual(body.api, { active: 0, waiting: 0, pausedFor: 0 });
    assert.doesNotMatch(JSON.stringify(body), /\bqr\b|markdown|zk_/);
    assert.equal(server.calls.length, 0, 'a health check must not spend a unit');
  } finally {
    await server.close();
  }
});

test('a client can list and call tools over HTTP', async () => {
  const server = await start({ queue: [ok({ qr: 'https://api.zactonz.com/qr/a.png' })], inlineImageBytes: 0 });
  const client = await connect(server.origin);
  try {
    const listed = await client.listTools();
    assert.ok(listed.tools.some((tool) => tool.name === 'generate_qr_code'));

    const result = await client.callTool({ name: 'generate_qr_code', arguments: { content: 'https://zactonz.com' } });
    assert.equal(result.isError, undefined, JSON.stringify(result.content));
    assert.equal(result.structuredContent.qr, 'https://api.zactonz.com/qr/a.png');
  } finally {
    await client.close();
    await server.close();
  }
});

test('a request brings its own keys, and is answered with those alone', async () => {
  const server = await start({ queue: [ok({ qr: 'https://api.zactonz.com/qr/a.png' })], inlineImageBytes: 0 });
  const client = await connect(server.origin, { [KEYS_HEADER]: 'zk_qr_onlythisproduct' });
  try {
    const listed = await client.listTools();
    const names = listed.tools.map((tool) => tool.name);
    assert.ok(names.includes('generate_qr_code'));
    assert.ok(!names.includes('lookup_dns'), 'a tool the request has no key for must not be offered');

    const result = await client.callTool({ name: 'generate_qr_code', arguments: { content: 'x' } });
    assert.equal(result.isError, undefined, JSON.stringify(result.content));
    assert.equal(server.calls[0].headers.Authorization, 'Bearer zk_qr_onlythisproduct');
    assert.ok(
      server.keyrings.every((products) => products.join() === 'qr'),
      `every server built for this request saw only the qr key, got ${JSON.stringify(server.keyrings)}`,
    );
  } finally {
    await client.close();
    await server.close();
  }
});

test('one request’s keys do not reach the next', async () => {
  const server = await start();
  const first = await connect(server.origin, { [KEYS_HEADER]: 'zk_qr_aaa' });
  const second = await connect(server.origin, { [KEYS_HEADER]: 'zk_domain_bbb' });
  try {
    const one = (await first.listTools()).tools.map((tool) => tool.name);
    const two = (await second.listTools()).tools.map((tool) => tool.name);

    assert.ok(one.includes('generate_qr_code') && !one.includes('lookup_dns'));
    assert.ok(two.includes('lookup_dns') && !two.includes('generate_qr_code'));
  } finally {
    await first.close();
    await second.close();
    await server.close();
  }
});

test('keys are also accepted as a bearer token', async () => {
  const server = await start();
  const client = await connect(server.origin, { authorization: 'Bearer zk_domain_bearertoken' });
  try {
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    assert.ok(names.includes('lookup_whois'));
    assert.ok(!names.includes('generate_qr_code'));
  } finally {
    await client.close();
    await server.close();
  }
});

test('a request that brings no keys falls back to the process keys', async () => {
  const server = await start({ keys: 'zk_markdown_processkey' });
  const client = await connect(server.origin);
  try {
    const names = (await client.listTools()).tools.map((tool) => tool.name);
    assert.ok(names.includes('convert_html_to_markdown'));
    assert.ok(!names.includes('generate_qr_code'));
  } finally {
    await client.close();
    await server.close();
  }
});

test('the fallback can be turned off, and then a request without keys is refused', async () => {
  const server = await start({ requireKeyHeader: true });
  try {
    const response = await raw(server.port, { body: { jsonrpc: '2.0', id: 1, method: 'tools/list' } });
    const body = JSON.parse(response.text);

    assert.equal(response.status, 401);
    assert.match(body.error.message, new RegExp(KEYS_HEADER));
    assert.equal(server.keyrings.length, 0, 'no server is built for a refused request');
  } finally {
    await server.close();
  }
});

test('a request whose keys are not Zactonz keys is told so, not handed the catalogue', async () => {
  const server = await start();
  try {
    const response = await raw(server.port, {
      headers: { authorization: 'Bearer ya29.a0AfH6SMB-an-oauth-token' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    assert.equal(response.status, 401);
    assert.match(JSON.parse(response.text).error.message, /is a Zactonz key/);
    assert.doesNotMatch(response.text, /ya29/, 'the refusal must not repeat the credential');
    assert.equal(server.keyrings.length, 0, 'no server is built for a refused request');
  } finally {
    await server.close();
  }
});

test('a request carrying an Origin header is refused before the protocol sees it', async () => {
  const server = await start();
  try {
    const response = await raw(server.port, {
      headers: { origin: 'https://evil.example' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.text).error, /does not serve browsers/);
    assert.doesNotMatch(response.text, /evil\.example/, 'the refusal must not reflect the origin back');
    assert.ok(server.logs.some((line) => line.includes('evil.example')));
  } finally {
    await server.close();
  }
});

test('an allowed browser origin is let through', async () => {
  const server = await start({ allowedOrigins: ['https://app.example'] });
  try {
    const response = await raw(server.port, {
      headers: { origin: 'https://app.example' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    assert.equal(response.status, 200);
  } finally {
    await server.close();
  }
});

test('a request naming another host is refused', async () => {
  const server = await start();
  try {
    const response = await raw(server.port, {
      headers: { host: 'rebind.example' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });

    assert.equal(response.status, 403);
    assert.match(JSON.parse(response.text).error, /Host header/);
    assert.doesNotMatch(response.text, /rebind\.example/, 'the refusal must not reflect the host back');
    assert.ok(server.logs.some((line) => line.includes('rebind.example')));
  } finally {
    await server.close();
  }
});

test('a host the operator named is answered', async () => {
  const named = await start({ allowedHosts: ['agents.internal'] });
  const unnamed = await start();
  try {
    const allowed = await raw(named.port, {
      headers: { host: 'agents.internal' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    assert.equal(allowed.status, 200);

    const refused = await raw(unnamed.port, {
      headers: { host: 'agents.internal' },
      body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
    });
    assert.equal(refused.status, 403, 'the same host is refused where it was not named');
  } finally {
    await named.close();
    await unnamed.close();
  }
});

test('only POST is offered at the MCP endpoint, and nothing else is served', async () => {
  const server = await start();
  try {
    const stream = await raw(server.port, { method: 'GET' });
    assert.equal(stream.status, 405);
    assert.equal(stream.headers.allow, 'POST');
    assert.match(JSON.parse(stream.text).error.message, /keeps no session/);

    const ended = await raw(server.port, { method: 'DELETE' });
    assert.equal(ended.status, 405);

    // No CORS headers on a preflight either: a browser is not a caller here.
    const preflight = await raw(server.port, { method: 'OPTIONS' });
    assert.equal(preflight.status, 405);
    assert.equal(preflight.headers['access-control-allow-origin'], undefined);

    const elsewhere = await raw(server.port, { path: '/', method: 'GET' });
    assert.equal(elsewhere.status, 404);
    assert.match(JSON.parse(elsewhere.text).error, new RegExp(`POST ${MCP_PATH}`));
  } finally {
    await server.close();
  }
});

test('a body larger than the limit is refused rather than read', async () => {
  const server = await start({ maxBodyBytes: 256 });
  try {
    const response = await raw(server.port, { body: callBody('generate_qr_code', { content: 'x'.repeat(2000) }) });

    assert.equal(response.status, 413);
    assert.equal(server.calls.length, 0);
  } finally {
    await server.close();
  }
});

test('load is shed rather than queued once the limit is reached', async () => {
  let release = () => {};
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const server = await start({ maxRequests: 1, queue: [() => held], inlineImageBytes: 0 });
  try {
    const first = raw(server.port, { body: callBody('generate_qr_code', { content: 'x' }) });
    await until(() => server.calls.length === 1);

    const second = await raw(server.port, { body: callBody('generate_qr_code', { content: 'y' }, 2) });
    assert.equal(second.status, 503);
    assert.equal(second.headers['retry-after'], '1');
    assert.match(JSON.parse(second.text).error.message, /already handling 1 request/);

    release(ok({ qr: 'https://api.zactonz.com/qr/a.png' }));
    const answered = await first;
    assert.equal(answered.status, 200);
    assert.match(answered.text, /api\.zactonz\.com/, 'the held request is still answered');
  } finally {
    release(ok({}));
    await server.close();
  }
});

test('one governor holds back the whole process, not each request on its own', async () => {
  let release = () => {};
  const held = new Promise((resolve) => {
    release = resolve;
  });
  const server = await start({
    governor: createGovernor({ maxConcurrency: 1 }),
    inlineImageBytes: 0,
    queue: [() => held, ok({ qr: 'https://api.zactonz.com/qr/b.png' })],
  });
  try {
    const first = raw(server.port, { body: callBody('generate_qr_code', { content: 'a' }) });
    await until(() => server.calls.length === 1);

    const second = raw(server.port, { body: callBody('generate_qr_code', { content: 'b' }, 2) });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(server.calls.length, 1, 'the second request waits for the first call to finish');

    release(ok({ qr: 'https://api.zactonz.com/qr/a.png' }));
    assert.equal((await first).status, 200);
    assert.equal((await second).status, 200);
    assert.equal(server.calls.length, 2);
  } finally {
    release(ok({}));
    await server.close();
  }
});

test('readHttpSettings keeps stdio unless the transport is asked for', () => {
  assert.equal(readHttpSettings({}, []).enabled, false);
  assert.equal(readHttpSettings({}, ['--http']).enabled, true);
  assert.equal(readHttpSettings({ ZACTONZ_MCP_TRANSPORT: 'http' }, []).enabled, true);
  assert.equal(readHttpSettings({ ZACTONZ_MCP_TRANSPORT: 'stdio' }, []).enabled, false);
  assert.match(readHttpSettings({ ZACTONZ_MCP_TRANSPORT: 'sse' }, []).warnings[0], /is not "stdio" or "http"/);
});

test('readHttpSettings takes the host and port from a flag or the environment', () => {
  assert.deepEqual((({ host, port }) => ({ host, port }))(readHttpSettings({}, ['--http'])), {
    host: '127.0.0.1',
    port: 8808,
  });
  assert.equal(readHttpSettings({}, ['--http', '--port', '9000']).port, 9000);
  assert.equal(readHttpSettings({}, ['--http', '--port=9001']).port, 9001);
  assert.equal(readHttpSettings({ ZACTONZ_MCP_PORT: '9002' }, ['--http']).port, 9002);
  assert.equal(readHttpSettings({ ZACTONZ_MCP_PORT: '9002' }, ['--http', '--port', '9003']).port, 9003);
  assert.match(
    readHttpSettings({ ZACTONZ_MCP_PORT: '70000' }, ['--http']).warnings[0],
    /is not a port from 0 to 65535/,
  );
  // A flag given without a value falls back rather than binding everything.
  assert.equal(readHttpSettings({}, ['--http', '--host']).host, '127.0.0.1');
  assert.equal(readHttpSettings({}, ['--http', '--host=']).host, '127.0.0.1');
});

test('readHttpSettings says what binding away from loopback means', () => {
  const settings = readHttpSettings({ ZACTONZ_MCP_HOST: '0.0.0.0', ZACTONZ_API_KEYS: 'zk_qr_abc' }, ['--http']);

  assert.ok(settings.warnings.some((warning) => /reachable from outside this machine/.test(warning)));
  assert.ok(settings.warnings.some((warning) => /TLS/.test(warning)));
  assert.ok(settings.warnings.some((warning) => /Host header is not checked/.test(warning)));
  assert.ok(settings.warnings.some((warning) => /REQUIRE_KEY_HEADER/.test(warning)));
});

test('readHttpSettings stays quiet about a loopback bind', () => {
  assert.deepEqual(readHttpSettings({ ZACTONZ_API_KEYS: 'zk_qr_abc' }, ['--http']).warnings, []);
  assert.deepEqual(readHttpSettings({ ZACTONZ_MCP_HOST: 'localhost' }, ['--http']).warnings, []);
});

test('readHttpSettings warns when a browser origin is allowed', () => {
  const settings = readHttpSettings({ ZACTONZ_MCP_ALLOWED_ORIGINS: 'https://app.example' }, ['--http']);

  assert.deepEqual(settings.allowedOrigins, ['https://app.example']);
  assert.match(settings.warnings[0], /can spend this server/);
});
