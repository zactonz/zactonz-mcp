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
