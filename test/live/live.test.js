/**
 * Starts the real server over stdio and calls the real API. Run with
 * ZACTONZ_API_KEYS set; tools whose product has no key are skipped.
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { parseKeys } from '../../src/keys.js';

const configured = parseKeys(process.env.ZACTONZ_API_KEYS);
const unset = configured.products.length === 0 ? 'Set ZACTONZ_API_KEYS to run the live tests' : false;
const skipUnless = (product) => unset || (configured.has(product) ? false : `No key for the ${product} product`);
const production = !process.env.ZACTONZ_BASE_URL;

let client;

before(async () => {
  if (unset) {
    return;
  }
  client = new Client({ name: 'live-test', version: '1.0.0' });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [fileURLToPath(new URL('../../bin/zactonz-mcp.js', import.meta.url))],
      env: { ...process.env },
      stderr: 'inherit',
    }),
  );
});

after(async () => {
  await client?.close();
});

async function call(name, args) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120000 });
  assert.equal(result.isError, undefined, result.content?.[0]?.text);
  return result;
}

const fields = (result, index = 0) => JSON.parse(result.content.filter((block) => block.type === 'text')[index].text);
const image = (result) => result.content.find((block) => block.type === 'image');

/** Links only resolve on the production host, so inline images are only expected there. */
function assertImage(result, mimeType) {
  if (production) {
    assert.equal(image(result)?.mimeType, mimeType);
    assert.ok(Buffer.from(image(result).data, 'base64').length > 100);
  }
}

test('lists the tools the configured keys can call', { skip: unset }, async () => {
  const { tools } = await client.listTools();

  assert.ok(tools.length >= 2);
  assert.ok(tools.some((tool) => tool.name === 'check_api_key'));
});

test('check_api_key', { skip: skipUnless('qr') }, async () => {
  const status = fields(await call('check_api_key', { product: 'qr' }));

  assert.equal(status.key.product, 'qr');
  assert.equal(typeof status.quota.day.remaining, 'number');
});

test('generate_qr_code and read_qr_code', { skip: skipUnless('qr') }, async () => {
  const encoded = await call('generate_qr_code', { content: 'zactonz-mcp-roundtrip', size: 6 });
  assert.match(fields(encoded).qr, /\/qr\/enc\/i\//);
  assertImage(encoded, 'image/png');

  if (production) {
    const decoded = await call('read_qr_code', { image: fields(encoded).qr });
    assert.match(decoded.content[0].text, /third party/);
    assert.equal(fields(decoded, 1).content, 'zactonz-mcp-roundtrip');
  }
});

test('generate_barcode', { skip: skipUnless('barcode') }, async () => {
  const result = await call('generate_barcode', { content: 'ZCTZ-0042', scale: 3 });

  assert.equal(fields(result).height, 60);
  assertImage(result, 'image/png');
});

test('an API refusal is returned as a tool error', { skip: skipUnless('barcode') }, async () => {
  const result = await client.callTool({
    name: 'generate_barcode',
    arguments: { content: '5901234123450', type: 'ean13' },
  });

  assert.equal(result.isError, true);
  assert.match(result.content[0].text, /check digit.*Status 400/);
});

test('lookup_dns, inspect_ssl_certificate and lookup_whois', { skip: skipUnless('domain') }, async () => {
  assert.ok(fields(await call('lookup_dns', { name: 'zactonz.com', type: ['A', 'MX'] })).records.A[0].address);
  assert.equal(fields(await call('inspect_ssl_certificate', { host: 'developers.zactonz.com' })).valid, true);
  assert.equal(fields(await call('lookup_whois', { domain: 'www.zactonz.com' })).domain, 'zactonz.com');
});

test('check_email_domain', { skip: skipUnless('email') }, async () => {
  assert.equal(
    typeof fields(await call('check_email_domain', { domain: 'zactonz.com', selectors: ['default'] })).score,
    'number',
  );
});

test('verify_emails', { skip: skipUnless('mverifier') }, async () => {
  const result = fields(await call('verify_emails', { emails: ['info@zactonz.com'] }));

  assert.ok(['valid', 'invalid'].includes(result.mails['info@zactonz.com']));
});

test('preview_link', { skip: skipUnless('unfurl') }, async () => {
  const result = await call('preview_link', { url: 'https://developers.zactonz.com/apis/' });

  assert.match(fields(result, 1).title, /API/);
});

test('read_webpage and convert_html_to_markdown', { skip: skipUnless('markdown') }, async () => {
  const page = await call('read_webpage', {
    url: 'https://developers.zactonz.com/apis/authentication/',
    max_chars: 3000,
  });
  assert.match(page.content[1].text, /Bearer/);
  assert.ok(page.content[1].text.length <= 3000);
  assert.equal(fields(page, 2).markdown, undefined);

  const own = await call('convert_html_to_markdown', {
    html: '<article><h1>Invoice 1042</h1><p>Total due: <strong>120 USD</strong>.</p></article>',
    mode: 'full',
  });
  assert.match(own.content[0].text, /\*\*120 USD\*\*/);
});

test('inspect_image and convert_image', { skip: skipUnless('image') }, async () => {
  const source = 'https://zactonz.com/assets/images/logo.png';
  assert.ok(fields(await call('inspect_image', { url: source })).source.width > 0);

  const converted = await call('convert_image', { url: source, format: 'webp', width: 32 });
  assert.equal(fields(converted).output.format, 'webp');
  assertImage(converted, 'image/webp');
});

test('generate_social_image', { skip: skipUnless('og') }, async () => {
  const result = await call('generate_social_image', { title: 'Zactonz MCP', theme: 'dark', format: 'jpeg' });

  assert.equal(fields(result).size, '1200x630');
  assertImage(result, 'image/jpeg');
});

test('capture_screenshot and render_html', { skip: skipUnless('screen') }, async () => {
  const page = await call('capture_screenshot', { url: 'https://zactonz.com', width: 800, height: 600, delay: 1 });
  assert.match(fields(page).url, /\.jpe?g$/);
  assert.equal(fields(page).width, 800);
  assertImage(page, 'image/jpeg');

  const pdf = await call('render_html', { html: '<html><body><h1>Invoice 1042</h1></body></html>', format: 'pdf' });
  assert.match(fields(pdf).url, /\.pdf$/);
  assert.equal(image(pdf), undefined);
});

test('get_drive_download_link', { skip: skipUnless('gdrive') }, async () => {
  const result = await call('get_drive_download_link', {
    url: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/view',
  });

  assert.match(fields(result).direct_link, /1AbCdEfGhIjKlMnOpQrStUvWxYz012345/);
});

test('translate_text', { skip: skipUnless('translator') }, async () => {
  assert.equal(fields(await call('translate_text', { text: 'Good morning', to: 'es' })).to, 'es');
});
