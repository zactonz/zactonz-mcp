import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DEFAULT_BASE_URL, VERSION, createApi } from './api.js';
import {
  DEFAULT_HOST,
  DEFAULT_MAX_BODY_BYTES,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_PORT,
  HEALTH_PATH,
  KEYS_HEADER,
  MCP_PATH,
  createHttpServer,
  listen,
  readHttpSettings,
  readNumber,
} from './http.js';
import { CONSOLE_URL, KEYS_VARIABLE, parseKeys } from './keys.js';
import { DEFAULT_INLINE_IMAGE_BYTES, createServer } from './server.js';
import tools from './tools.js';

const HELP = `zactonz-mcp ${VERSION}

Model Context Protocol server for the Zactonz APIs. By default it speaks MCP
over stdio, so an MCP client starts it rather than you. With --http it listens
instead, and one process can serve a fleet of agents.

Usage:
  zactonz-mcp                      speak MCP on stdin and stdout
  zactonz-mcp --http               listen for MCP at http://${DEFAULT_HOST}:${DEFAULT_PORT}${MCP_PATH}
  zactonz-mcp --http --port 9000    listen on another port
  zactonz-mcp --help               print this
  zactonz-mcp --version            print the version

Options:
  --http                           listen instead of speaking on stdio
  --host <address>                 address to bind (default ${DEFAULT_HOST})
  --port <number>                  port to bind (default ${DEFAULT_PORT}, 0 for any free port)

Environment:
  ${KEYS_VARIABLE}                 one or more API keys, separated by commas
  ZACTONZ_MCP_INLINE_IMAGE_BYTES   largest image returned inline (default ${DEFAULT_INLINE_IMAGE_BYTES}, 0 to turn off)
  ZACTONZ_BASE_URL                 API base URL (default ${DEFAULT_BASE_URL})

Environment, listening only:
  ZACTONZ_MCP_TRANSPORT            stdio or http (same as --http)
  ZACTONZ_MCP_HOST                 address to bind (same as --host)
  ZACTONZ_MCP_PORT                 port to bind (same as --port)
  ZACTONZ_MCP_REQUIRE_KEY_HEADER   1 to refuse a request that brings no key of its own
  ZACTONZ_MCP_ALLOWED_HOSTS        Host header values to answer to, separated by commas
  ZACTONZ_MCP_ALLOWED_ORIGINS      browser origins allowed to call, separated by commas
  ZACTONZ_MCP_MAX_REQUESTS         requests handled at once (default ${DEFAULT_MAX_REQUESTS}, 0 for no limit)
  ZACTONZ_MCP_MAX_BODY_BYTES       largest request body (default ${DEFAULT_MAX_BODY_BYTES})

When listening, a request may bring its own keys in the ${KEYS_HEADER} header,
or as a bearer token, and they are used for that request alone. A request that
brings none is answered with the keys in ${KEYS_VARIABLE}.
A liveness probe can read ${HEALTH_PATH}, which spends nothing.

Create keys at ${CONSOLE_URL}
`;

/**
 * Reads the server's settings from the environment and lists anything in
 * them the operator should know about.
 *
 * @param {NodeJS.ProcessEnv} env
 */
export function readSettings(env) {
  const keys = parseKeys(env[KEYS_VARIABLE]);
  const known = new Set(tools.map((tool) => tool.product));
  const warnings = [];
  if (keys.rejected.length) {
    warnings.push(`ignored ${keys.rejected.join(', ')}: not in the form zk_<product>_<secret>`);
  }
  for (const product of keys.products.filter((name) => !known.has(name))) {
    warnings.push(`the key for "${product}" matches no tool; known products are ${[...known].join(', ')}`);
  }
  if (keys.products.length === 0) {
    warnings.push(
      `${KEYS_VARIABLE} holds no usable key, so every tool will answer with setup instructions. Create keys at ${CONSOLE_URL}`,
    );
  }

  const inlineImageBytes = readNumber(env, 'ZACTONZ_MCP_INLINE_IMAGE_BYTES', DEFAULT_INLINE_IMAGE_BYTES, warnings, {
    accept: (value) => value >= 0,
    expected: 'a number',
  });

  return { keys, inlineImageBytes, baseUrl: env.ZACTONZ_BASE_URL?.trim() || DEFAULT_BASE_URL, warnings };
}

/**
 * @param {string[]} [argv]
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.includes('--version') || argv.includes('-v')) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(HELP);
    return;
  }
  const { keys, inlineImageBytes, baseUrl, warnings } = readSettings(env);
  const http = readHttpSettings(env, argv);
  // stdout carries the protocol, so anything for the operator goes to stderr.
  for (const warning of [...warnings, ...http.warnings]) {
    process.stderr.write(`zactonz-mcp: ${warning}\n`);
  }
  if (!http.enabled) {
    const server = createServer({ keys, api: createApi({ keys, baseUrl }), inlineImageBytes });
    await server.connect(new StdioServerTransport());
    return;
  }
  const listener = createHttpServer({ keys, baseUrl, inlineImageBytes, ...http });
  const bound = await listen(listener, http.port, http.host);
  const address = bound.host.includes(':') ? `[${bound.host}]` : bound.host;
  process.stderr.write(`zactonz-mcp: listening for MCP on http://${address}:${bound.port}${MCP_PATH}\n`);
}
