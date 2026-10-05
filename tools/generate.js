/**
 * Generates src/tools.js and docs/tools.md from the API specifications in
 * specs/, using the names and descriptions in tools/tools.config.js.
 *
 *   node tools/generate.js           write the files
 *   node tools/generate.js --check   write nothing; fail if a file is out of date
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from './tools.config.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORTAL = 'https://developers.zactonz.com';
const NOTICE = 'Generated from specs/ by tools/generate.js. Edits made here are lost the next time it runs.';

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function loadSpecifications() {
  const specs = new Map();
  for (const file of readdirSync(join(ROOT, 'specs'))
    .filter((name) => name.endsWith('.json'))
    .sort()) {
    const spec = JSON.parse(readFileSync(join(ROOT, 'specs', file), 'utf8'));
    specs.set(spec['x-zactonz']?.slug ?? file.replace(/\.json$/, ''), spec);
  }
  const unnamed = [...specs.keys()].filter((slug) => !(slug in config));
  const missing = Object.keys(config).filter((slug) => !specs.has(slug));
  if (unnamed.length) {
    fail(`Specifications with no entry in tools/tools.config.js: ${unnamed.join(', ')}`);
  }
  if (missing.length) {
    fail(`Entries in tools/tools.config.js with no specification: ${missing.join(', ')}`);
  }
  return specs;
}

/** Query parameters and form fields of an operation, in one list. */
function specParameters(spec) {
  const path = Object.keys(spec.paths)[0];
  const http = Object.keys(spec.paths[path])[0];
  const operation = spec.paths[path][http];
  const parameters = (operation.parameters ?? []).map((p) => ({
    name: p.name,
    schema: p.schema ?? {},
    required: Boolean(p.required),
    description: p.description ?? '',
  }));
  const form = operation.requestBody?.content?.['application/x-www-form-urlencoded']?.schema ?? {};
  for (const [name, schema] of Object.entries(form.properties ?? {})) {
    parameters.push({
      name,
      schema,
      required: (form.required ?? []).includes(name),
      description: schema.description ?? '',
    });
  }
  return { path, http: http.toUpperCase(), parameters };
}

/**
 * The specifications describe parameters as they travel over HTTP, where a
 * flag is `1` or `0`. A model is offered real booleans, so those are reworded.
 */
function describe(text, type) {
  const oneLine = String(text ?? '')
    .replace(/\]\(\/(?!\/)/g, `](${PORTAL}/`)
    .replace(/\s+/g, ' ')
    .trim();
  return type === 'boolean' ? oneLine.replace(/^`1` /, 'When true, ').replace(/^`0` /, 'When false, ') : oneLine;
}

function property(parameter, tool) {
  const { schema } = parameter;
  const type = ['integer', 'number', 'boolean'].includes(schema.type) ? schema.type : 'string';
  const description = describe(tool.describe?.[parameter.name] ?? parameter.description, type);
  if ((tool.lists ?? []).includes(parameter.name)) {
    return { type: 'array', items: { type: 'string' }, minItems: 1, description };
  }
  const result = { type, description };
  if (Array.isArray(schema.enum) && schema.enum.length) {
    result.enum = schema.enum;
  }
  for (const bound of ['minimum', 'maximum']) {
    if (typeof schema[bound] === 'number') {
      result[bound] = schema[bound];
    }
  }
  const preset = tool.defaults?.[parameter.name] ?? schema.default;
  if (preset !== undefined && preset !== null && preset !== '') {
    result.default = preset;
  }
  return result;
}

function buildTools(specs) {
  const tools = [];
  for (const [slug, entries] of Object.entries(config)) {
    const spec = specs.get(slug);
    const product = spec['x-zactonz']?.product ?? fail(`The specification for ${slug} has no x-zactonz.product`);
    const { path, http, parameters } = specParameters(spec);
    for (const tool of entries) {
      if (tools.some((existing) => existing.name === tool.name)) {
        fail(`Duplicate tool name: ${tool.name}`);
      }
      const fixed = tool.force ?? {};
      const hidden = new Set([...(tool.hide ?? []), ...Object.keys(fixed)]);
      const added = (tool.add ?? []).map((p) => ({
        name: p.name,
        schema: { type: p.type },
        required: Boolean(p.required),
        description: p.description,
      }));
      const offered = [...parameters, ...added].filter(
        (p) => !hidden.has(p.name) && (!tool.only || tool.only.includes(p.name)),
      );
      const required = offered.filter((p) => p.required || (tool.require ?? []).includes(p.name)).map((p) => p.name);
      const ordered = [...offered].sort(
        (a, b) => Number(required.includes(b.name)) - Number(required.includes(a.name)),
      );
      tools.push({
        name: tool.name,
        title: tool.title,
        description: tool.description,
        reference: `${PORTAL}/apis/${slug}/`,
        product,
        method: tool.http ?? http,
        path,
        readOnly: Boolean(tool.readOnly),
        untrusted: Boolean(tool.untrusted),
        fixed,
        defaults: tool.defaults ?? {},
        wrap: tool.wrap ?? null,
        image: tool.image ?? null,
        text: tool.text ?? null,
        inputSchema: {
          type: 'object',
          properties: Object.fromEntries(ordered.map((p) => [p.name, property(p, tool)])),
          required,
          additionalProperties: false,
        },
      });
    }
  }
  return tools;
}

function renderModule(tools) {
  const shipped = tools.map(({ reference, ...tool }) => tool);
  return `// ${NOTICE}\nexport default ${JSON.stringify(shipped, null, 2)};\n`;
}

function renderReference(tools) {
  const out = [
    '# Tools',
    '',
    'Every tool the server offers and the arguments each accepts. A tool is offered to the assistant only when a key for its product is configured.',
    '',
    `<!-- ${NOTICE} -->`,
    '',
    '| Tool | Purpose | Key |',
    '|---|---|---|',
    ...tools.map((tool) => `| \`${tool.name}\` | ${tool.title} | \`${tool.product}\` |`),
    '| `check_api_key` | Check the plan and remaining quota of a key | any |',
  ];
  for (const tool of tools) {
    out.push('', `## ${tool.name}`, '', tool.description, '');
    out.push(
      `- **Endpoint:** \`${tool.method} ${tool.path}\``,
      `- **Key:** \`${tool.product}\``,
      `- **Full reference:** ${tool.reference}`,
      '',
    );
    out.push('| Argument | Type | Required | Default | Description |', '|---|---|---|---|---|');
    for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
      const type = schema.type === 'array' ? 'array of strings' : schema.type;
      const allowed = schema.enum ? ` One of ${schema.enum.map((value) => `\`${value}\``).join(', ')}.` : '';
      const required = tool.inputSchema.required.includes(name) ? 'yes' : 'no';
      const preset = schema.default === undefined ? '' : `\`${schema.default}\``;
      out.push(
        `| \`${name}\` | ${type} | ${required} | ${preset} | ${schema.description.replace(/\|/g, '\\|')}${allowed} |`,
      );
    }
  }
  return `${out.join('\n')}\n`;
}

const tools = buildTools(loadSpecifications());
const files = { 'src/tools.js': renderModule(tools), 'docs/tools.md': renderReference(tools) };

if (process.argv.includes('--check')) {
  const stale = Object.entries(files)
    .filter(([path, contents]) => !existsSync(join(ROOT, path)) || readFileSync(join(ROOT, path), 'utf8') !== contents)
    .map(([path]) => path);
  if (stale.length) {
    fail(`Out of date; run node tools/generate.js:\n  ${stale.join('\n  ')}`);
  }
  process.stdout.write('Generated files are up to date\n');
} else {
  for (const [path, contents] of Object.entries(files)) {
    writeFileSync(join(ROOT, path), contents);
  }
  process.stdout.write(`${tools.length} tools written\n`);
}
