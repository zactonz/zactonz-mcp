import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { DEFAULT_BASE_URL, VERSION, createApi } from './api.js';
import { CONSOLE_URL, KEYS_VARIABLE, parseKeys } from './keys.js';
import { DEFAULT_INLINE_IMAGE_BYTES, createServer } from './server.js';
import tools from './tools.js';

const HELP = `zactonz-mcp ${VERSION}

Model Context Protocol server for the Zactonz APIs. It speaks MCP over stdio,
so it is started by an MCP client rather than run by hand.

Environment:
  ${KEYS_VARIABLE}                 one or more API keys, separated by commas
  ZACTONZ_MCP_INLINE_IMAGE_BYTES   largest image returned inline (default ${DEFAULT_INLINE_IMAGE_BYTES}, 0 to turn off)
  ZACTONZ_BASE_URL                 API base URL (default ${DEFAULT_BASE_URL})

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

  const raw = env.ZACTONZ_MCP_INLINE_IMAGE_BYTES?.trim() ?? '';
  const limit = Number(raw);
  let inlineImageBytes = DEFAULT_INLINE_IMAGE_BYTES;
  if (raw !== '') {
    if (Number.isFinite(limit) && limit >= 0) {
      inlineImageBytes = limit;
    } else {
      warnings.push(`ZACTONZ_MCP_INLINE_IMAGE_BYTES="${raw}" is not a number; using ${DEFAULT_INLINE_IMAGE_BYTES}`);
    }
  }

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
  // stdout carries the protocol, so anything for the operator goes to stderr.
  for (const warning of warnings) {
    process.stderr.write(`zactonz-mcp: ${warning}\n`);
  }
  const server = createServer({ keys, api: createApi({ keys, baseUrl }), inlineImageBytes });
  await server.connect(new StdioServerTransport());
}
