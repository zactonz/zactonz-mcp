import { createServer as createListener } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { DEFAULT_BASE_URL, VERSION, createApi } from './api.js';
import { createGovernor } from './governor.js';
import { CONSOLE_URL, KEYS_VARIABLE, parseKeys } from './keys.js';
import { DEFAULT_INLINE_IMAGE_BYTES, createServer } from './server.js';
import generated from './tools.js';

export const DEFAULT_HOST = '127.0.0.1';
export const DEFAULT_PORT = 8808;

/** Where the server speaks MCP, and where it answers a liveness probe. */
export const MCP_PATH = '/mcp';
export const HEALTH_PATH = '/healthz';

/** Header a request uses to bring its own keys, instead of the process keys. */
export const KEYS_HEADER = 'x-zactonz-api-keys';

/** Requests handled at once before the server sheds load. */
export const DEFAULT_MAX_REQUESTS = 64;

/**
 * Largest JSON-RPC body accepted, in bytes. The largest argument any tool
 * takes is an HTML document, and the API refuses one far smaller than this.
 */
export const DEFAULT_MAX_BODY_BYTES = 1048576;

/**
 * @typedef {import('./keys.js').Keyring} Keyring
 * @typedef {import('./api.js').Api} Api
 * @typedef {typeof generated[number]} Tool
 */

/**
 * Serves MCP over streamable HTTP, so that one process can answer a fleet of
 * agents rather than one parent process.
 *
 * Every request is answered by a server of its own, built around the keys that
 * request brought and discarded with it. That is what makes the keys per
 * request rather than per process: the tool list a caller sees, and the quota a
 * call spends, follow the key in the header and never leak into the next
 * caller's request. The cost is that nothing is remembered between requests —
 * which this server has no use for, having nothing to stream and no session
 * state to keep.
 *
 * @param {object} options
 * @param {Keyring} options.keys Process keys, used by a request that brings none.
 * @param {string} [options.baseUrl]
 * @param {number} [options.inlineImageBytes]
 * @param {string} [options.host] The address the listener will be bound to; decides the Host allowlist.
 * @param {string[]} [options.allowedHosts] Extra Host header values to answer to.
 * @param {string[]} [options.allowedOrigins] Browser origins allowed to call this server.
 * @param {boolean} [options.requireKeyHeader] Refuse a request that brings no key of its own.
 * @param {number} [options.maxRequests]
 * @param {number} [options.maxBodyBytes]
 * @param {import('./governor.js').Governor} [options.governor] Shared by every request.
 * @param {(options: { keys: Keyring, baseUrl: string, governor: import('./governor.js').Governor }) => Api} [options.makeApi]
 * @param {(line: string) => void} [options.log]
 * @param {Tool[]} [options.tools]
 * @returns {import('node:http').Server}
 */
export function createHttpServer({
  keys,
  baseUrl = DEFAULT_BASE_URL,
  inlineImageBytes = DEFAULT_INLINE_IMAGE_BYTES,
  host = DEFAULT_HOST,
  allowedHosts = [],
  allowedOrigins = [],
  requireKeyHeader = false,
  maxRequests = DEFAULT_MAX_REQUESTS,
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
  governor = createGovernor(),
  makeApi = createApi,
  log = (line) => process.stderr.write(`zactonz-mcp: ${line}\n`),
  tools = generated,
}) {
  let inFlight = 0;

  /*
   * A request listener that rejects takes the process down with it, so every
   * path out of handle() ends in an answer, including the ones nobody planned.
   */
  const listener = createListener((request, response) => {
    void handle(request, response).catch((error) => {
      log(`failed to answer a request: ${error instanceof Error ? error.message : String(error)}`);
      if (response.writableEnded || response.destroyed) {
        return;
      }
      if (response.headersSent) {
        response.end();
      } else {
        reply(response, 500, rpcError('The server could not answer this request.'));
      }
    });
  });

  /**
   * @param {import('node:http').IncomingMessage} request
   * @param {import('node:http').ServerResponse} response
   */
  async function handle(request, response) {
    const path = (request.url ?? '/').split('?')[0].replace(/\/+$/, '') || '/';
    const method = request.method ?? 'GET';

    const refusal = guard(request);
    if (refusal) {
      log(`refused a request to ${clip(path)}: ${refusal.reason}`);
      return reply(response, 403, { error: refusal.answer });
    }

    if (path === HEALTH_PATH) {
      if (method !== 'GET' && method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        return reply(response, 405, { error: `Only GET is allowed at ${HEALTH_PATH}.` });
      }
      return reply(
        response,
        200,
        {
          status: 'ok',
          name: 'zactonz-mcp',
          version: VERSION,
          transport: 'http',
          tools: tools.length,
          // The count, never the products: this endpoint has no caller to trust.
          environmentKeys: keys.products.length,
          inFlight,
          api: governor.state(),
        },
        method === 'HEAD',
      );
    }

    if (path !== MCP_PATH) {
      return reply(response, 404, {
        error: `Not found. This server speaks MCP at POST ${MCP_PATH} and reports health at GET ${HEALTH_PATH}.`,
      });
    }

    /*
     * Only POST. Keeping no session leaves nothing to send on the GET stream
     * and nothing to end on DELETE, and the specification allows a server with
     * no server-initiated messages to say so with a 405 rather than hold a
     * connection open that will never carry anything.
     */
    if (method !== 'POST') {
      response.setHeader('Allow', 'POST');
      return reply(
        response,
        405,
        rpcError(
          `Only POST is allowed at ${MCP_PATH}. This server keeps no session, so it has nothing to stream on GET and nothing to end on DELETE.`,
        ),
      );
    }

    if (maxRequests > 0 && inFlight >= maxRequests) {
      response.setHeader('Retry-After', '1');
      return reply(
        response,
        503,
        rpcError(
          `This server is already handling ${maxRequests} request${maxRequests === 1 ? '' : 's'}. Try again in a moment.`,
        ),
      );
    }

    const presented = header(request, KEYS_HEADER) ?? bearer(header(request, 'authorization'));
    if (!presented && requireKeyHeader) {
      return reply(
        response,
        401,
        rpcError(
          `This server takes its API keys from each request. Send them in the ${KEYS_HEADER} header, separated by commas.`,
        ),
      );
    }
    const keyring = presented ? parseKeys(presented) : keys;
    /*
     * A caller that presented a credential and had all of it set aside is told
     * so. Over stdio the same keyring lists every tool and explains the setup
     * on each call, which suits a person reading the log; a program that sent a
     * key and got the whole catalogue back would conclude the key worked.
     */
    if (presented && keyring.products.length === 0) {
      return reply(
        response,
        401,
        rpcError(
          `None of the keys presented in the ${KEYS_HEADER} header is a Zactonz key. One looks like zk_<product>_<secret>, and is created at ${CONSOLE_URL}`,
        ),
      );
    }

    inFlight += 1;
    const server = createServer({
      keys: keyring,
      // One governor for the process: a client built per request cannot hold
      // back traffic the other requests are sending.
      api: makeApi({ keys: keyring, baseUrl, governor }),
      inlineImageBytes,
      tools,
    });
    const transport = new StreamableHTTPServerTransport({
      // Stateless: see the note on this function.
      sessionIdGenerator: undefined,
      maxRequestBodySize: maxBodyBytes,
    });
    response.once('close', () => {
      inFlight -= 1;
      void transport.close().catch(() => {});
      void server.close().catch(() => {});
    });
    await server.connect(transport);
    await transport.handleRequest(request, response);
  }

  /**
   * Checks a request against the two headers a browser cannot be made to lie
   * about. A page the user is visiting can reach a server bound to loopback —
   * DNS rebinding turns a name the attacker controls into this address — so a
   * request that names a host this server was not given, or carries any origin
   * at all, is refused before it reaches the protocol. The reason is logged
   * rather than returned: the operator needs the value, the caller does not.
   *
   * @param {import('node:http').IncomingMessage} request
   * @returns {{ reason: string, answer: string } | null}
   */
  function guard(request) {
    const origin = header(request, 'origin');
    if (origin && !allowedOrigins.includes(origin)) {
      return {
        reason: `Origin: ${clip(origin)}`,
        answer: 'Refused: this server does not serve browsers, and the request carried an Origin header.',
      };
    }
    const expected = hostAllowlist();
    const given = (header(request, 'host') ?? '').toLowerCase();
    if (expected && !expected.has(given)) {
      return {
        reason: `Host: ${clip(given) || 'none'}; expected one of ${[...expected].join(', ')}`,
        answer: 'Refused: the Host header does not name this server. Set ZACTONZ_MCP_ALLOWED_HOSTS if it should.',
      };
    }
    return null;
  }

  /**
   * Host header values this server answers to, or null when the check cannot
   * be made. Bound to loopback the set is knowable; bound anywhere else the
   * operator reaches the server by a name only they know — a container, a
   * service, a proxy — so they state it or the check stays off.
   *
   * @returns {Set<string> | null}
   */
  function hostAllowlist() {
    const extra = allowedHosts.map((name) => name.trim().toLowerCase()).filter(Boolean);
    if (!isLoopback(host)) {
      return extra.length ? new Set(extra) : null;
    }
    const address = listener.address();
    const port = address && typeof address === 'object' ? address.port : 0;
    const names = new Set(extra);
    for (const name of ['127.0.0.1', 'localhost', '[::1]']) {
      names.add(`${name}:${port}`);
      if (port === 80) {
        names.add(name);
      }
    }
    return names;
  }

  return listener;
}

/**
 * Binds the listener, resolving once it is accepting requests so that a
 * failure to bind is reported as a failure to start.
 *
 * @param {import('node:http').Server} listener
 * @param {number} port
 * @param {string} host
 * @returns {Promise<{ host: string, port: number }>}
 */
export function listen(listener, port, host) {
  return new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(port, host, () => {
      listener.removeListener('error', reject);
      const address = listener.address();
      resolve(address && typeof address === 'object' ? { host: address.address, port: address.port } : { host, port });
    });
  });
}

/**
 * Reads the transport's settings, and reports anything in them the operator
 * should know before the first request arrives rather than after it.
 *
 * @param {NodeJS.ProcessEnv} env
 * @param {string[]} [argv]
 */
export function readHttpSettings(env, argv = []) {
  /** @type {string[]} */
  const warnings = [];
  const flagged = argv.includes('--http');
  const named = (env.ZACTONZ_MCP_TRANSPORT ?? '').trim().toLowerCase();
  if (named !== '' && named !== 'http' && named !== 'stdio') {
    warnings.push(`ZACTONZ_MCP_TRANSPORT="${named}" is not "stdio" or "http"; using stdio`);
  }
  const enabled = flagged || named === 'http';

  const host = flag(argv, '--host') ?? env.ZACTONZ_MCP_HOST?.trim() ?? DEFAULT_HOST;
  const port = readNumber(
    { ZACTONZ_MCP_PORT: flag(argv, '--port') ?? env.ZACTONZ_MCP_PORT },
    'ZACTONZ_MCP_PORT',
    DEFAULT_PORT,
    warnings,
    // Port 0 is left to mean "any free port", which the tests and a scratch run want.
    { accept: (value) => Number.isInteger(value) && value >= 0 && value <= 65535, expected: 'a port from 0 to 65535' },
  );
  const maxRequests = readNumber(env, 'ZACTONZ_MCP_MAX_REQUESTS', DEFAULT_MAX_REQUESTS, warnings, {
    accept: (value) => Number.isInteger(value) && value >= 0,
    expected: 'a whole number of requests, or 0 for no limit',
  });
  const maxBodyBytes = readNumber(env, 'ZACTONZ_MCP_MAX_BODY_BYTES', DEFAULT_MAX_BODY_BYTES, warnings, {
    accept: (value) => Number.isInteger(value) && value > 0,
    expected: 'a whole number of bytes above zero',
  });

  const allowedHosts = list(env.ZACTONZ_MCP_ALLOWED_HOSTS);
  const allowedOrigins = list(env.ZACTONZ_MCP_ALLOWED_ORIGINS);
  const requireKeyHeader = truthy(env.ZACTONZ_MCP_REQUIRE_KEY_HEADER);

  if (enabled && !isLoopback(host)) {
    warnings.push(
      `the server will listen on ${host}, so it is reachable from outside this machine. It has no authentication of its own: a caller is whoever holds a Zactonz key. Put TLS in front of it, or keys will travel in cleartext.`,
    );
    if (allowedHosts.length === 0) {
      warnings.push('the Host header is not checked, because ZACTONZ_MCP_ALLOWED_HOSTS is unset');
    }
    if (!requireKeyHeader && parseKeys(env[KEYS_VARIABLE]).products.length > 0) {
      warnings.push(
        `a request that brings no ${KEYS_HEADER} header will be answered with the keys in ${KEYS_VARIABLE}. Set ZACTONZ_MCP_REQUIRE_KEY_HEADER=1 to make every caller bring its own.`,
      );
    }
  }
  if (enabled && allowedOrigins.length > 0) {
    warnings.push(
      `browser origins are allowed to call this server: ${allowedOrigins.join(', ')}. A page on one of them can spend this server's quota.`,
    );
  }

  return {
    enabled,
    host,
    port,
    allowedHosts,
    allowedOrigins,
    requireKeyHeader,
    maxRequests,
    maxBodyBytes,
    warnings,
  };
}

/**
 * Reads a number from the environment, keeping the default and saying so when
 * the value given is not one.
 *
 * @param {Record<string, string | undefined>} env
 * @param {string} name
 * @param {number} fallback
 * @param {string[]} warnings
 * @param {object} rule
 * @param {(value: number) => boolean} rule.accept
 * @param {string} rule.expected
 * @returns {number}
 */
export function readNumber(env, name, fallback, warnings, { accept, expected }) {
  const raw = env[name]?.trim() ?? '';
  if (raw === '') {
    return fallback;
  }
  const value = Number(raw);
  if (Number.isFinite(value) && accept(value)) {
    return value;
  }
  warnings.push(`${name}="${raw}" is not ${expected}; using ${fallback}`);
  return fallback;
}

/**
 * @param {string} host
 * @returns {boolean}
 */
export function isLoopback(host) {
  return host === 'localhost' || host === '::1' || host === '::ffff:127.0.0.1' || /^127\./.test(host);
}

/**
 * @param {string[]} argv
 * @param {string} name
 * @returns {string | undefined}
 */
function flag(argv, name) {
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === name) {
      return argv[index + 1] || undefined;
    }
    if (argv[index].startsWith(`${name}=`)) {
      return argv[index].slice(name.length + 1) || undefined;
    }
  }
  return undefined;
}

/**
 * @param {string | undefined} value
 * @returns {string[]}
 */
function list(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * @param {string | undefined} value
 * @returns {boolean}
 */
function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(
    String(value ?? '')
      .trim()
      .toLowerCase(),
  );
}

/**
 * Node joins a header sent twice into one comma-separated value, which is the
 * form the keys are given in anyway.
 *
 * @param {import('node:http').IncomingMessage} request
 * @param {string} name
 * @returns {string | undefined}
 */
function header(request, name) {
  const value = request.headers[name];
  const text = (Array.isArray(value) ? value.join(',') : (value ?? '')).trim();
  return text === '' ? undefined : text;
}

/**
 * @param {string | undefined} value
 * @returns {string | undefined}
 */
function bearer(value) {
  const match = /^Bearer\s+(.+)$/i.exec(value ?? '');
  return match ? match[1].trim() : undefined;
}

/**
 * @param {string} value
 * @returns {string}
 */
function clip(value) {
  // eslint-disable-next-line no-control-regex
  const safe = value.replace(/[\u0000-\u001f\u007f]/g, '');
  return safe.length > 120 ? `${safe.slice(0, 120)}…` : safe;
}

/**
 * @param {string} message
 * @returns {Record<string, unknown>}
 */
function rpcError(message) {
  return { jsonrpc: '2.0', error: { code: -32600, message }, id: null };
}

/**
 * @param {import('node:http').ServerResponse} response
 * @param {number} status
 * @param {Record<string, unknown>} body
 * @param {boolean} [headOnly]
 */
function reply(response, status, body, headOnly = false) {
  const text = `${JSON.stringify(body)}\n`;
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    // Nothing here is cacheable, and a refusal least of all.
    'cache-control': 'no-store',
  });
  response.end(headOnly ? undefined : text);
}
