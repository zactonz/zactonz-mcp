# Contributing

Bug reports and pull requests are welcome.

## Setup

```bash
npm install
npm run check
```

`npm run check` verifies the generated files, then runs ESLint, Prettier, the TypeScript checker (over JSDoc types) and the unit tests. All must pass.

## Layout

- `src/api.js` calls the API: keys, retries, time budget, error handling.
- `src/server.js` is the MCP server: tool listing, argument validation, result shaping.
- `src/http.js` is the streamable HTTP transport: the Host and Origin guard, per-request keys, load shedding, the health endpoint.
- `src/main.js` reads the settings and picks the transport.
- `src/governor.js` holds back outbound traffic: the concurrency cap and the circuit breaker. One instance is shared by every API client in the process.
- `src/prompts.js` holds the prompts, each rendered against the tools on offer.
- `src/tools.js` and `docs/tools.md` are generated. Do not edit them.
- `specs/` holds one OpenAPI document per endpoint. They are copied from the API's documentation, so a change to an endpoint's parameters belongs upstream. Open an issue for those.
- `tools/tools.config.js` decides how endpoints become tools: names, descriptions, hidden and added arguments.

After changing `tools/` or `specs/`:

```bash
npm run generate
```

## Tests

```bash
npm test
```

The live suite starts the real server and calls the real API, which spends quota. It skips tools you have no key for:

```bash
ZACTONZ_API_KEYS="zk_qr_…,zk_domain_…" npm run test:live
```

## Style

Prettier formats the code. Exported functions carry JSDoc with types, which `npm run typecheck` verifies. Comments explain why, where the code alone does not.
