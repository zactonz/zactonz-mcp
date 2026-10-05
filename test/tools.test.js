import assert from 'node:assert/strict';
import { test } from 'node:test';
import tools from '../src/tools.js';

const PRODUCTS = [
  'qr',
  'barcode',
  'screen',
  'og',
  'image',
  'unfurl',
  'markdown',
  'domain',
  'email',
  'mverifier',
  'translator',
  'gdrive',
];
const VERBS = [
  'capture',
  'render',
  'read',
  'convert',
  'preview',
  'lookup',
  'inspect',
  'check',
  'verify',
  'generate',
  'translate',
  'get',
];

test('tool names are unique and start with a verb', () => {
  const names = tools.map((tool) => tool.name);

  assert.equal(new Set(names).size, names.length);
  for (const name of names) {
    assert.match(name, /^[a-z]+(_[a-z]+)+$/);
    assert.ok(VERBS.includes(name.split('_')[0]), name);
  }
});

test('every tool has a title and a description of useful length', () => {
  for (const tool of tools) {
    assert.ok(tool.title.length >= 8, tool.name);
    assert.ok(tool.description.length >= 40 && tool.description.length <= 600, tool.name);
  }
});

test('every product is covered and every tool calls a known product', () => {
  for (const tool of tools) {
    assert.ok(PRODUCTS.includes(tool.product), `${tool.name}: ${tool.product}`);
    assert.ok(['GET', 'POST'].includes(tool.method), tool.name);
    assert.match(tool.path, /^\/[a-z/]+\/$/, tool.name);
  }
  assert.deepEqual([...new Set(tools.map((tool) => tool.product))].sort(), [...PRODUCTS].sort());
});

test('input schemas are closed and fully described', () => {
  for (const tool of tools) {
    const { type, properties, required, additionalProperties } = tool.inputSchema;
    assert.equal(type, 'object');
    assert.equal(additionalProperties, false);
    assert.ok(required.length >= 1, tool.name);
    for (const name of required) {
      assert.ok(name in properties, `${tool.name}: ${name}`);
    }
    for (const [name, schema] of Object.entries(properties)) {
      assert.ok(['string', 'integer', 'number', 'boolean', 'array'].includes(schema.type), `${tool.name}.${name}`);
      assert.ok(schema.description.length > 0, `${tool.name}.${name}`);
    }
  }
});

test('descriptions do not describe the HTTP encoding of an argument', () => {
  for (const tool of tools) {
    for (const [name, schema] of Object.entries(tool.inputSchema.properties)) {
      const where = `${tool.name}.${name}: ${schema.description}`;
      assert.doesNotMatch(schema.description, /\]\(\//, where);
      if (schema.type === 'boolean') {
        assert.doesNotMatch(schema.description, /`[01]`/, where);
      }
      for (const mentioned of schema.description.match(/`([a-z0-9_]+)` is an alias/g) ?? []) {
        assert.fail(`${where} mentions an alias (${mentioned}) the schema does not accept`);
      }
    }
  }
});

test('arguments the server sets itself are not offered to the model', () => {
  for (const tool of tools) {
    for (const name of [...Object.keys(tool.fixed), 'key', 'k', 'sig', 'download', 'file', 'resp']) {
      assert.ok(!(name in tool.inputSchema.properties), `${tool.name}: ${name}`);
    }
  }
});

test('a default the server sends is declared on the argument', () => {
  for (const tool of tools) {
    for (const [name, value] of Object.entries(tool.defaults)) {
      assert.equal(tool.inputSchema.properties[name]?.default, value, `${tool.name}: ${name}`);
    }
  }
});

test('tools that only look something up are marked read-only', () => {
  const readOnly = tools.filter((tool) => tool.readOnly).map((tool) => tool.name);

  for (const name of [
    'read_webpage',
    'convert_html_to_markdown',
    'preview_link',
    'lookup_dns',
    'inspect_ssl_certificate',
    'lookup_whois',
  ]) {
    assert.ok(readOnly.includes(name), name);
  }
  for (const name of ['capture_screenshot', 'render_html', 'generate_qr_code', 'verify_emails']) {
    assert.ok(!readOnly.includes(name), name);
  }
});
