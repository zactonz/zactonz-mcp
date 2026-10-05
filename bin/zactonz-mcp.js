#!/usr/bin/env node
import { main } from '../src/main.js';

main().catch((error) => {
  process.stderr.write(`zactonz-mcp: ${error?.message ?? error}\n`);
  process.exit(1);
});
